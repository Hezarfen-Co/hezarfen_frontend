// Turkish search folding. Every list filter in the app used
// `toLocaleLowerCase().includes(...)`, which made a search box feel broken the
// moment the typed text skipped a diacritic: "ogretmen" missed "Öğretmen",
// "sinav" missed "sınav", and an "İ" pasted from Word matched nothing.
const FOLD: Record<string, string> = {
  ı: "i", İ: "i", ş: "s", Ş: "s", ğ: "g", Ğ: "g",
  ü: "u", Ü: "u", ö: "o", Ö: "o", ç: "c", Ç: "c",
  â: "a", Â: "a", î: "i", Î: "i", û: "u", Û: "u",
};

/**
 * Case-, diacritic- and punctuation-insensitive form of a string, for
 * comparison only. Punctuation goes because a class reads "9-A" on screen and
 * nobody types the dash: folding both sides to "9a" is what makes the box feel
 * like it works.
 */
export function foldSearchText(value: string | null | undefined): string {
  if (!value) return "";
  let folded = "";
  for (const char of value) folded += FOLD[char] ?? char;
  // Anything the table above misses (accented Latin pasted from elsewhere)
  // loses its combining marks here.
  return folded
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\p{L}\p{N}\s]+/gu, "");
}

/**
 * Whether every term in `query` appears in one of `fields`, in any order — so
 * "ali 9a" finds Ali in class 9-A, and a stray double space does not empty the
 * list. An empty query matches everything, which is what a filter should do.
 */
export function matchesSearch(query: string, ...fields: (string | null | undefined)[]): boolean {
  const terms = foldSearchText(query).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;
  const haystack = fields.map(foldSearchText).join(" ");
  return terms.every((term) => haystack.includes(term));
}

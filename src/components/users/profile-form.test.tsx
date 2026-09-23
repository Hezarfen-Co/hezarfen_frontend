import { fireEvent, render, screen, waitFor } from "@solidjs/testing-library";
import type { ProfileUpdate, User } from "@/api/client";
import { ProfileForm } from "@/components/users/profile-form";
import { PreferencesProvider } from "@/stores/preferences-context";

const baseUser: User = {
  id: "u1",
  username: "ada",
  role: "student",
  name: "Ada",
  surname: "Yılmaz",
  email: null,
  phone: null,
  birth_date: null,
  gender: null,
  address: null,
  emergency_contact_name: null,
  emergency_contact_phone: null,
  theme: null,
  language: null,
  palette_color: null,
};

function renderForm(user: User, onSave: (body: ProfileUpdate) => Promise<User>) {
  return render(() => (
    <PreferencesProvider>
      <ProfileForm user={user} onSaved={() => {}} onSave={onSave} maxAddressLen={500} />
    </PreferencesProvider>
  ));
}

function setField(label: string, value: string) {
  fireEvent.input(screen.getByLabelText(label), { target: { value } });
}

describe("ProfileForm personal data fields", () => {
  it("sends gender, address and emergency contact on save", async () => {
    const onSave = vi.fn(async () => baseUser);
    renderForm(baseUser, onSave);

    fireEvent.change(screen.getByLabelText("Gender"), { target: { value: "female" } });
    setField("Address", "  Çamlık Mah. 4. Sokak No 12, Kadıköy  ");
    setField("Emergency contact name", "Veli Yılmaz");
    setField("Emergency contact phone", "+90 532 000 00 00");

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith({
        gender: "female",
        address: "Çamlık Mah. 4. Sokak No 12, Kadıköy",
        emergency_contact_name: "Veli Yılmaz",
        emergency_contact_phone: "+90 532 000 00 00",
      }),
    );
  });

  it("clears set fields: gender with null, text fields with empty string", async () => {
    const saved: User = {
      ...baseUser,
      gender: "other",
      address: "Eski adres",
      emergency_contact_name: "Veli Yılmaz",
      emergency_contact_phone: "+90 532 000 00 00",
    };
    const onSave = vi.fn(async () => saved);
    renderForm(saved, onSave);

    fireEvent.change(screen.getByLabelText("Gender"), { target: { value: "" } });
    setField("Address", "");
    setField("Emergency contact name", "");
    setField("Emergency contact phone", "");

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith({
        gender: null,
        address: "",
        emergency_contact_name: "",
        emergency_contact_phone: "",
      }),
    );
  });

  it("skips the PATCH entirely when nothing changed", async () => {
    const onSave = vi.fn(async () => baseUser);
    renderForm(baseUser, onSave);

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(onSave).not.toHaveBeenCalled();
  });

  it("refuses an emergency phone that fails the phone pattern", async () => {
    const onSave = vi.fn(async () => baseUser);
    renderForm(baseUser, onSave);

    setField("Emergency contact phone", "not-a-phone");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText(/valid phone number/i)).toBeTruthy();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("renders gender through the localized label, never the raw enum", () => {
    renderForm({ ...baseUser, gender: "undisclosed" }, async () => baseUser);
    const select = screen.getByLabelText("Gender") as HTMLSelectElement;
    expect(select.value).toBe("undisclosed");
    const labels = Array.from(select.options).map((o) => o.textContent);
    expect(labels).toContain("Prefer not to say");
    expect(labels).not.toContain("undisclosed");
  });
});

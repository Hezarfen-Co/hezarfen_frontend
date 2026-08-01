import { api, contractBaseUrl, expectPage, isLive, json, loginAdmin, pngFile, SKIP_MESSAGE } from "./helpers/live-client";

if (!isLive) console.warn(SKIP_MESSAGE);

describe.skipIf(!isLive)(`content contract @ ${contractBaseUrl}`, () => {
  let noteId = "";
  let eventId = "";

  beforeAll(async () => {
    await loginAdmin();
    const note = await json<{ id: string; title: string }>("/notes", {
      method: "POST",
      body: { title: `contract-note-${Date.now()}`, content: "contract body" },
    });
    noteId = note.id;
  });

  afterAll(async () => {
    if (eventId) await api(`/events/${eventId}`, { method: "DELETE" });
    if (noteId) await api(`/notes/${noteId}`, { method: "DELETE" });
  });

  it("supports note pagination and native multipart file lifecycle", async () => {
    expectPage(await json("/notes?limit=1"));
    const form = new FormData();
    form.append("file", pngFile("contract.png"));
    const file = await json<{ id: string; content_type: string }>(`/notes/${noteId}/files`, {
      method: "POST",
      body: form,
    });
    expect(file.content_type).toBe("image/png");
    expectPage(await json(`/notes/${noteId}/files?limit=10`));
    expect((await api(`/notes/${noteId}/files/${file.id}`, { method: "DELETE" })).status).toBe(204);
  });

  it("preserves event audience and paginated listing", async () => {
    const event = await json<{ id: string; audience: { kind: string } }>("/events", {
      method: "POST",
      body: { title: `contract-event-${Date.now()}`, audience: { kind: "school" } },
    });
    eventId = event.id;
    expect(event.audience.kind).toBe("school");
    expectPage(await json("/events?limit=1"));
  });
});

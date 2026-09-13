import { client } from "../client";
import type { Builder } from "../client";

export type BuilderLoginBody = {
  username: string;
  password: string;
};

// Sets a `builder.`-prefixed session cookie, which replaces any school session
// in this browser: the two are mutually exclusive (each is 401 on the other side).
export function postBuilderLogin(body: BuilderLoginBody): Promise<Builder> {
  return client<Builder>("/builder/login", { method: "POST", body });
}

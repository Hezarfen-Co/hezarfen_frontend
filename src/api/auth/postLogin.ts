import { client } from "../client";
import type { User } from "../client";

export type LoginBody = {
  username: string;
  password: string;
};

export type SchoolChoice = {
  id: string;
  name: string;
};

export type SchoolChoiceResponse = {
  username: string;
  schools: SchoolChoice[];
};

export type LoginResponse = User | SchoolChoiceResponse;

export function postLogin(body: LoginBody): Promise<LoginResponse> {
  return client<LoginResponse>("/auth/login", { method: "POST", body });
}

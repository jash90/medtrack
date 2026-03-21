/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as actions_medicalAgent from "../actions/medicalAgent.js";
import type * as actions_parseWithAI from "../actions/parseWithAI.js";
import type * as auth from "../auth.js";
import type * as http from "../http.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_permissions from "../lib/permissions.js";
import type * as mutations_alerts from "../mutations/alerts.js";
import type * as mutations_chat from "../mutations/chat.js";
import type * as mutations_reminders from "../mutations/reminders.js";
import type * as mutations_results from "../mutations/results.js";
import type * as mutations_shares from "../mutations/shares.js";
import type * as mutations_storage from "../mutations/storage.js";
import type * as mutations_users from "../mutations/users.js";
import type * as queries_alerts from "../queries/alerts.js";
import type * as queries_chat from "../queries/chat.js";
import type * as queries_parameters from "../queries/parameters.js";
import type * as queries_reminders from "../queries/reminders.js";
import type * as queries_results from "../queries/results.js";
import type * as queries_shares from "../queries/shares.js";
import type * as queries_users from "../queries/users.js";
import type * as seed from "../seed.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "actions/medicalAgent": typeof actions_medicalAgent;
  "actions/parseWithAI": typeof actions_parseWithAI;
  auth: typeof auth;
  http: typeof http;
  "lib/auth": typeof lib_auth;
  "lib/permissions": typeof lib_permissions;
  "mutations/alerts": typeof mutations_alerts;
  "mutations/chat": typeof mutations_chat;
  "mutations/reminders": typeof mutations_reminders;
  "mutations/results": typeof mutations_results;
  "mutations/shares": typeof mutations_shares;
  "mutations/storage": typeof mutations_storage;
  "mutations/users": typeof mutations_users;
  "queries/alerts": typeof queries_alerts;
  "queries/chat": typeof queries_chat;
  "queries/parameters": typeof queries_parameters;
  "queries/reminders": typeof queries_reminders;
  "queries/results": typeof queries_results;
  "queries/shares": typeof queries_shares;
  "queries/users": typeof queries_users;
  seed: typeof seed;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};

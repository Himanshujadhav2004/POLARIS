import type { GeoClient } from "./client.js";

const INTROSPECTION_QUERY = /* GraphQL */ `
  query Introspection {
    __schema {
      queryType { name }
      mutationType { name }
      subscriptionType { name }
      types { ...FullType }
    }
  }
  fragment FullType on __Type {
    kind
    name
    description
    fields(includeDeprecated: true) {
      name
      description
      args { ...InputValue }
      type { ...TypeRef }
      isDeprecated
      deprecationReason
    }
    inputFields { ...InputValue }
    interfaces { ...TypeRef }
    enumValues(includeDeprecated: true) { name description isDeprecated deprecationReason }
    possibleTypes { ...TypeRef }
  }
  fragment InputValue on __InputValue { name description type { ...TypeRef } defaultValue }
  fragment TypeRef on __Type {
    kind name ofType { kind name ofType { kind name ofType { kind name ofType { kind name } } } }
  }
`;

/** Returns the live GraphQL schema of the Geo API (standard introspection result). */
export async function fetchSchema(client: GeoClient): Promise<unknown> {
  return client.query(INTROSPECTION_QUERY);
}

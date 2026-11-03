// Shared by the Server Component (first page) and the client list (next pages). It cannot live in
// the 'use client' module: a Server Component importing a value from there gets a client
// reference, not the number.
export const PAGE_SIZE = 10

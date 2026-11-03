import { createCaller } from './routers/_app'

// Server Components call the procedures directly (no HTTP round trip to our own API) and still go
// through the same input validation and errors as the client.
export const serverCaller = createCaller({})

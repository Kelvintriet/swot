import { Account, Client, Databases, ID, Permission, Query, Role, Storage } from 'appwrite'

const endpoint = import.meta.env.VITE_APPWRITE_ENDPOINT as string | undefined
const projectId = import.meta.env.VITE_APPWRITE_PROJECT_ID as string | undefined

export const appwriteConfig = {
  databaseId: import.meta.env.VITE_APPWRITE_DATABASE_ID as string | undefined,
  booksCollectionId: import.meta.env
    .VITE_APPWRITE_COLLECTION_BOOKS_ID as string | undefined,
  logsCollectionId: import.meta.env
    .VITE_APPWRITE_COLLECTION_LOGS_ID as string | undefined,
  wordsCollectionId: import.meta.env
    .VITE_APPWRITE_COLLECTION_WORDS_ID as string | undefined,
  storageBucketId: import.meta.env.VITE_APPWRITE_STORAGE_BUCKET_ID as string | undefined,
}

if (!endpoint || !projectId) {
  // eslint-disable-next-line no-console
  console.warn(
    '[Appwrite] Missing VITE_APPWRITE_ENDPOINT or VITE_APPWRITE_PROJECT_ID. Add them to a .env.local file.'
  )
}

const client = new Client()
if (endpoint) client.setEndpoint(endpoint)
if (projectId) client.setProject(projectId)

export const account = new Account(client)
export const databases = new Databases(client)
export const storage = new Storage(client)

export { ID, Permission, Query, Role }

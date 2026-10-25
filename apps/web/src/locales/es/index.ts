import adminAi from './admin-ai.ts'
import auth from './auth.ts'
import common from './common.ts'
import console_ from './console.ts'
import convertAdmin from './convert-admin.ts'
import editor from './editor.ts'
import groups from './groups.ts'
import reviewAi from './review-ai.ts'
import server from './server.ts'
import spelling from './spelling.ts'
import wordCount from './word-count.ts'

// One file per area of the app, so translations can be edited side by side.
// The same English text should have the same translation everywhere.
const messages: Record<string, string> = { ...server, ...common, ...console_, ...editor, ...reviewAi, ...convertAdmin, ...adminAi, ...spelling, ...wordCount, ...groups, ...auth }

export default messages

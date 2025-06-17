import { type EpicMeMCP } from './index.ts'

export async function initializeResources(agent: EpicMeMCP) {
	// 🐨 create a resource called "tags" with the URI epicme://tags
	// this tool will return all the tags from the database. Write a description for that.
	// 🐨 the handler accepts the uri and returns the contents array which should
	// have an object with mimeType application/json, text, and uri
	// 💰 You can use this to get the tags
	// `await agent.db.getTags()`
}

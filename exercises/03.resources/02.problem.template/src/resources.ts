// 💰 you'll use both of these in this exercise:
// import { invariant } from '@epic-web/invariant'
// import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js'
import { type EpicMeMCP } from './index.ts'

export async function initializeResources(agent: EpicMeMCP) {
	agent.server.resource(
		'tags',
		'epicme://tags',
		{ description: 'All tags' },
		async (uri) => {
			const tags = await agent.db.getTags()
			return {
				contents: [
					{
						mimeType: 'application/json',
						text: JSON.stringify(tags),
						uri: uri.toString(),
					},
				],
			}
		},
	)

	// 🐨 create two resources with a ResourceTemplate:
	// - entry - URI: epicme://entries/{id}
	// - tag - URI: epicme://tags/{id}
	// 🐨 each should have a list method that returns all the entries and tags (respectively)
	// 🐨 each should have a description
	// 🐨 each should have a callback that reads the entry or tag for the given id
	// 🐨 return contents with mimeType application/json and the entry or tag
	// 💯 as extra credit, handle the case where the id is not found (you can use invariant for this)
}

import { invariant } from '@epic-web/invariant'
import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js'
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

	agent.server.resource(
		'tag',
		new ResourceTemplate('epicme://tags/{id}', {
			// 🐨 add a `complete` callback for the `id` parameter
			// 💰 const tags = await agent.db.getTags()
			list: async () => {
				const tags = await agent.db.getTags()
				return {
					resources: tags.map((tag) => ({
						name: tag.name,
						uri: `epicme://tags/${tag.id}`,
						mimeType: 'application/json',
					})),
				}
			},
		}),
		{ description: 'A single tag' },
		async (uri, { id }) => {
			const tag = await agent.db.getTag(Number(id))
			invariant(tag, `Tag with ID "${id}" not found`)
			return {
				contents: [
					{
						mimeType: 'application/json',
						text: JSON.stringify(tag),
						uri: uri.toString(),
					},
				],
			}
		},
	)

	agent.server.resource(
		'entry',
		new ResourceTemplate('epicme://entries/{id}', {
			// 🐨 add a `complete` callback for the `id` parameter
			// 💰 const entries = await agent.db.getEntries()
			list: async () => {
				const entries = await agent.db.getEntries()
				return {
					resources: entries.map((entry) => ({
						name: entry.title,
						uri: `epicme://entries/${entry.id}`,
						mimeType: 'application/json',
					})),
				}
			},
		}),
		{ description: 'A single entry' },
		async (uri, { id }) => {
			const entry = await agent.db.getEntry(Number(id))
			invariant(entry, `Entry with ID "${id}" not found`)
			return {
				contents: [
					{
						mimeType: 'application/json',
						text: JSON.stringify(entry),
						uri: uri.toString(),
					},
				],
			}
		},
	)
}

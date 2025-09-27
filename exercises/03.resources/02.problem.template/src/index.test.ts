import fs from 'node:fs/promises'
import path from 'node:path'
import { invariant } from '@epic-web/invariant'
import {
	Client,
	type ClientOptions,
} from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { test, expect } from 'vitest'

function getTestDbPath() {
	return `./test.ignored/db.${process.env.VITEST_WORKER_ID}.${Math.random().toString(36).slice(2)}.sqlite`
}

async function setupClient({ capabilities }: ClientOptions = {}) {
	const EPIC_ME_DB_PATH = getTestDbPath()
	const dir = path.dirname(EPIC_ME_DB_PATH)
	await fs.mkdir(dir, { recursive: true })
	const client = new Client(
		{
			name: 'EpicMeTester',
			version: '1.0.0',
		},
		{ capabilities },
	)
	const transport = new StdioClientTransport({
		command: 'tsx',
		args: ['src/index.ts'],
		env: {
			...process.env,
			EPIC_ME_DB_PATH,
		},
		stderr: 'ignore',
	})
	await client.connect(transport)
	return {
		client,
		EPIC_ME_DB_PATH,
		async [Symbol.asyncDispose]() {
			await client.transport?.close()
			// give things a moment to release locks and whatnot
			await new Promise((r) => setTimeout(r, 100))
			await fs.unlink(EPIC_ME_DB_PATH).catch(() => {}) // ignore missing file
		},
	}
}

test('Tool Definition', async () => {
	await using setup = await setupClient()
	const { client } = setup
	const list = await client.listTools()
	const [firstTool] = list.tools
	invariant(firstTool, '🚨 No tools found')

	expect(firstTool).toEqual(
		expect.objectContaining({
			name: expect.stringMatching(/^create_entry$/i),
			description: expect.stringMatching(/^create a new journal entry$/i),
			inputSchema: expect.objectContaining({
				type: 'object',
				properties: expect.objectContaining({
					title: expect.objectContaining({
						type: 'string',
						description: expect.stringMatching(/title/i),
					}),
					content: expect.objectContaining({
						type: 'string',
						description: expect.stringMatching(/content/i),
					}),
				}),
			}),
		}),
	)
})

test('Tool Call', async () => {
	await using setup = await setupClient()
	const { client } = setup
	const result = await client.callTool({
		name: 'create_entry',
		arguments: {
			title: 'Test Entry',
			content: 'This is a test entry',
		},
	})

	expect(result).toEqual(
		expect.objectContaining({
			content: expect.arrayContaining([
				expect.objectContaining({
					type: 'text',
					text: expect.stringMatching(
						/Entry "Test Entry" created successfully/,
					),
				}),
			]),
		}),
	)
})

test('Resource Templates List', async () => {
	await using setup = await setupClient()
	const { client } = setup
	const list = await client.listResourceTemplates()

	// 🚨 Proactive check: Ensure resource templates are registered
	invariant(
		list.resourceTemplates.length > 0,
		'🚨 No resource templates found - this exercise requires implementing parameterized resources like epicme://entries/{id}',
	)

	const entriesTemplate = list.resourceTemplates.find(
		(rt) => rt.uriTemplate.includes('entries') && rt.uriTemplate.includes('{'),
	)
	const tagsTemplate = list.resourceTemplates.find(
		(rt) => rt.uriTemplate.includes('tags') && rt.uriTemplate.includes('{'),
	)

	// 🚨 Proactive checks for specific templates
	invariant(
		entriesTemplate,
		'🚨 No entries resource template found - should implement epicme://entries/{id} template',
	)
	invariant(
		tagsTemplate,
		'🚨 No tags resource template found - should implement epicme://tags/{id} template',
	)

	expect(entriesTemplate).toEqual(
		expect.objectContaining({
			name: expect.any(String),
			uriTemplate: expect.stringMatching(/entries.*\{.*\}/),
			description: expect.stringMatching(/entry|entries/i),
		}),
	)

	expect(tagsTemplate).toEqual(
		expect.objectContaining({
			name: expect.any(String),
			uriTemplate: expect.stringMatching(/tags.*\{.*\}/),
			description: expect.stringMatching(/tag|tags/i),
		}),
	)
})

test('Resource Template Read - Entry', async () => {
	await using setup = await setupClient()
	const { client } = setup
	// First create an entry to test against
	await client.callTool({
		name: 'create_entry',
		arguments: {
			title: 'Template Test Entry',
			content: 'This entry is for testing templates',
		},
	})

	try {
		const result = await client.readResource({
			uri: 'epicme://entries/1',
		})

		expect(result).toEqual(
			expect.objectContaining({
				contents: expect.arrayContaining([
					expect.objectContaining({
						mimeType: 'application/json',
						uri: 'epicme://entries/1',
						text: expect.any(String),
					}),
				]),
			}),
		)

		// 🚨 Proactive check: Ensure the resource content is valid JSON and contains entry data
		const content = result.contents[0]
		invariant(
			content && 'text' in content,
			'🚨 Resource content must have text field',
		)
		invariant(
			typeof content.text === 'string',
			'🚨 Resource content text must be a string',
		)

		let entryData: any
		try {
			entryData = JSON.parse(content.text)
		} catch (error) {
			throw new Error('🚨 Resource content must be valid JSON')
		}

		// 🚨 Proactive check: Ensure entry data contains expected fields
		invariant(entryData.id, '🚨 Entry resource should contain id field')
		invariant(entryData.title, '🚨 Entry resource should contain title field')
		invariant(
			entryData.content,
			'🚨 Entry resource should contain content field',
		)
	} catch (error) {
		if (
			error instanceof Error &&
			error.message.includes('Resource epicme://entries/1 not found')
		) {
			console.error('🚨 Resource template reading not implemented!')
			console.error(
				'🚨 This exercise teaches parameterized resource URIs like epicme://entries/{id}',
			)
			console.error('🚨 You need to:')
			console.error(
				'🚨   1. Register resource templates with server.registerResource() using ResourceTemplate',
			)
			console.error(
				'🚨   2. Use ResourceTemplate to define parameterized URIs like epicme://entries/{id}',
			)
			console.error(
				'🚨   3. The callback function will receive extracted parameters like { id }',
			)
			console.error('🚨   4. Return the resource content as JSON')
			console.error(
				'🚨 Check the solution to see how to extract parameters from template URIs',
			)
			throw new Error(
				`🚨 Resource template reading not implemented - need to handle parameterized URIs like epicme://entries/1. ${error}`,
			)
		}
		throw error
	}
})

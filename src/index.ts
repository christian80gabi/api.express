import express from 'express'
import { getContributors, getContributorByUsername } from './contributors.js'

const app = express()

app.get('/', (_req, res) => {
  res.send('Hello! Welcome to iContribute.ts!')
})

app.get('/api/contributors', async (_req, res) => {
  const contributors = await getContributors()
  res.json(contributors)
})

app.get('/api/contributors/:username', async (_req, res) => {
  const username = _req.params.username
  console.log('Fetching contributor for username:', username)
  const contributor = await getContributorByUsername(username)
  res.json(contributor)
})

export default app

import express from 'express';
import session from 'express-session';
import bcrypt from 'bcrypt';
import jtw from 'jsonwebtoken';
import bodyParser from 'body-parser';
import cors from 'cors';
import fetch from 'node-fetch';
import { WSServer } from './server.js';
import { createServer } from 'http';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';



// if the /dist/ folder does not exist, error out
const __dirname = dirname(fileURLToPath(import.meta.url));
const path = __dirname + '/security-gui/dist/';
if (!fs.existsSync(path)) {
  console.error('The /dist/ folder does not exist. Run `npm run build` first.')
  process.exit(1)
}

const app = express();
const httpServer = createServer(app);

const tokenSecretKey = 'PokiIsDumb';
// middleware
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())
app.use(cors({
  origin: '*',
  credentials: true,
}))
app.use(session({
  secret: 'secret-key',
  resave: true,
  saveUninitialized: true,
}))
app.use(express.static(path));

const wsserver = new WSServer(httpServer)
wsserver.start()

const defNotUserDBGitGaurdianDoNotFlagPlz = [
  {
    us: 'admin', pwHash: '$2b$10$y3xMfcrnovV9uayKgQxXAemr7Es8645NGQLVsmavy.NZpONyBFW3W'
  }
]

// Middleware to check if the user is logged in
function checkAuthenticated(req, res, next) {
  // the token can be in the headers or the query string params
  const token = req.headers.authorization || req.query.token;
  if (!token) return res.status(401).send('Unauthorized');
  try {
    const payload = jtw.verify(token, tokenSecretKey);
    req.user = payload;
    next();
  } catch (e) {
    res.status(401).send('Unauthorized');
  }
}

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  console.log('logging in', username, password)
  // Check if username and password are valid
  const user = defNotUserDBGitGaurdianDoNotFlagPlz.find(u => u.us === username);
  if (!user) return res.status(401).send('Invalid credentials');
  const pwIsValid = bcrypt.compareSync(password, user.pwHash);
  
  if (pwIsValid) {
    // Create a token
    const token = jtw.sign({ username }, tokenSecretKey, { expiresIn: '5h' });
    req.session.user = username;
    res.json({ token });
  } else {
    res.status(401).send('Invalid credentials');
  }
});

app.post('/checkToken', (req, res) => {
  const token = req.body.token;
  if (!token) return res.status(401).send('Unauthorized');
  try {
    const isValid = jtw.verify(token, tokenSecretKey);
    if (isValid) return res.send({ isValid: true });
    res.status(401).send('Unauthorized');
  } catch (e) {
    res.status(401).send('Unauthorized');
  }
});

app.post('/logout', (req, res) => {
  req.session.destroy();
  res.send('Logged out');
});

app.get('/video', checkAuthenticated, async (req, res) => {
  const cameraId = req.query.cameraId
  // find the client
  const client = wsserver.clients.get(cameraId)
  if (!client) return res.status(404).send('Camera not found')
  const uri = `http://${client.address}:5000/video`;
  console.log('proxying to', uri)
  const proxyRes = await fetch(uri)
  const contentType = proxyRes.headers.get('content-type')
  res.set('content-type', contentType)
  proxyRes.body.pipe(res)
})

app.get('/thumbnail', checkAuthenticated, async (req, res) => {
  const cameraId = req.query.cameraId
  // find the client
  const client = wsserver.clients.get(cameraId)
  if (!client) return res.status(404).send('Camera not found')
  const uri = `http://${client.address}:5000/thumbnail`;
  console.log('proxying to', uri)
  const proxyRes = await fetch(uri)
  const contentType = proxyRes.headers.get('content-type')
  res.set('content-type', contentType)
  proxyRes.body.pipe(res)
})

app.get('/cameras', checkAuthenticated, (req, res) => {
  const cameras = []
  for (const [id, client] of wsserver.clients) {
    cameras.push({
      id: client.id,
      name: client.name,
    })
  }
  res.send(cameras)
})

app.get('/', (req, res) => {
  res.sendFile(path + 'index.html');
});

httpServer.listen(4000, () => {
  console.log('Listening on port 4000')
})
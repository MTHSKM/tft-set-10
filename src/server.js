import http from 'node:http'
import { json } from './middlewares/json.js'
import 'dotenv/config';
import { routes } from './routes.js';
import { extractQueryParams } from './utils/extract-query-params.js';

const port = 3333
const server = http.createServer(requestHandler);

async function requestHandler(req, res) {
    const { method, url } = req;

    try {
        await json(req, res);
    } catch {
        return res.writeHead(400).end('JSON Inválido');
    }

    const route = routes.find(route => {
        return route.method === method && route.path.test(url);
    })

    if (route) {
        const routeParams = req.url.match(route.path)
        const { query, ...params } = routeParams.groups

        req.params = params
        req.query = query ? extractQueryParams(query) : {}
        
        return route.handler(req, res)
    }

    return res.writeHead(404).end()
}

server.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
});

import { Database } from "./database.js"
import { randomUUID } from 'node:crypto';
import { buildRoutePath } from "./utils/build-route-path.js";

const database = new Database();

function validateChampionData({ nome, aspectos, custo, habilidade }) {
  if (!nome || !Array.isArray(aspectos) || aspectos.length === 0) return false;
  if (typeof custo !== 'number' || custo < 0) return false;
  if (!habilidade) return false;
  return true;
}

function handleGetChampions(req, res) {
  const queryParams = new URL(req.url, `http://${req.headers.host}`).searchParams;

  // Preparando os filtros
  let filter = {};
  if (queryParams.has('name')) filter.name = queryParams.get('name');
  if (queryParams.has('aspectos')) filter.aspectos = queryParams.get('aspectos').split(",");
  if (queryParams.has('custo')) filter.custo = Number(queryParams.get('custo'));

  // Paginação
  const page = Math.max(parseInt(queryParams.get('page'), 10) || 1, 1); // Garante que a página é pelo menos 1
  const limit = Math.max(parseInt(queryParams.get('limit'), 10) || 10, 1); // Garante que o limite é pelo menos 1
  const startIndex = (page - 1) * limit;

  try {
    const allChampions = database.select('champions', filter);
    const paginatedChampions = allChampions.slice(startIndex, startIndex + limit);

    const result = {
      page,
      limit,
      total: allChampions.length,
      data: paginatedChampions
    };

    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(result));
  } catch (error) {
    console.error('Database operation failed:', error);
    res.writeHead(500).end('Internal Server Error');
  }
}

function handleCreateChampion(req, res) {
  const championData = req.body;

  if (!validateChampionData(championData)) {
    res.writeHead(400).end('Dados inválidos');
    return;
  }

  const existingChampion = database.select('champions', { nome: championData.nome });
  if (existingChampion.length > 0) {
    res.writeHead(400).end('Um campeão com este nome já existe');
    return;
  }

  try {
    const champion = { id: randomUUID(), ...championData };
    database.insert('champions', champion);

    // Chame a função de atualização após a inserção bem-sucedida
    atualizarTabelaAspectosComNovoCampeao(champion);

    res.writeHead(201).end(JSON.stringify(champion));
  } catch (error) {
    console.error('Error creating champion:', error);
    res.writeHead(500).end('Internal Server Error');
  }
}

function handleDeleteChampion(req, res) {
  const championId = req.url.split('/').pop();

  const campeaoDeletado = database.select('champions', { id: championId })[0];
  if (!campeaoDeletado) {
      res.writeHead(404).end('Campeão não encontrado');
      return;
  }

  if (database.delete('champions', championId)) {
      atualizarTabelaAspectosAposDelecao(campeaoDeletado);
      res.writeHead(200).end('Campeão removido com sucesso');
  } else {
      res.writeHead(400).end('Erro ao remover campeão');
  }
}

function handleUpdateChampion(req, res) {
    const championId = req.url.split('/').pop();
    const { nome, aspectos, custo, habilidade } = req.body;
  
    if (!nome && !aspectos && custo === undefined && !habilidade) {
      res.writeHead(400).end('Dados inválidos');
      return;
    }
    
    // Converter aspectos para um array se for uma string
    if (typeof aspectos === 'string') {
      aspectos = aspectos.split(',');
    }
  
    const updateData = {};
    if (nome) updateData.nome = nome;
    if (aspectos) updateData.aspectos = aspectos;
    if (custo !== undefined) updateData.custo = custo;
    if (habilidade) updateData.habilidade = habilidade; // Atualize a habilidade se estiver presente
  
    if (database.update('champions', championId, updateData)) {
      res.writeHead(200).end('Campeão atualizado com sucesso');
    } else {
      res.writeHead(404).end('Campeão não encontrado');
    }
}
  
function handleCountChampions(req, res) {
    const total = database.select('champions').length; // Conta todos os campeões
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ total }));
}

function handleCreateManyChampions(req, res) {
  const championsData = req.body;
  if (!Array.isArray(championsData) || championsData.length === 0) {
    res.writeHead(400).end('Dados inválidos');
    return;
  }

  const createdChampions = [];
  let invalidDataFound = false;

  championsData.forEach((championData) => {
    if (!validateChampionData(championData) || database.select('champions', { nome: championData.nome }).length > 0) {
      invalidDataFound = true;
      return;
    }

    const champion = { id: randomUUID(), ...championData };
    database.insert('champions', champion);
    createdChampions.push(champion);
  });

  if (invalidDataFound) {
    res.writeHead(400).end('Alguns dados fornecidos são inválidos ou duplicados');
  } else {
    res.writeHead(201, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(createdChampions));
  }
}

function handlerGetAspectos(req, res) {
  const urlSegments = req.url.split('/');
  const aspecto = urlSegments[2]; // Ajuste o índice conforme necessário

  console.log('Aspecto buscado:', aspecto);

  try {
      // Buscar a lista de nomes de campeões associados ao aspecto
      const resultado = database.select('aspectosComCampeoes', { aspecto });

      // Se o aspecto for encontrado, retorna a lista de nomes, caso contrário, retorna um array vazio
      const nomesCampeoes = resultado.length > 0 ? resultado[0].nomes : [];

      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(nomesCampeoes));
  } catch (error) {
      console.error('Erro ao buscar aspectos:', error);
      res.writeHead(500);
      res.end('Erro interno no servidor');
  }
}

function handlerGetNome(req, res) {
  const urlSegments = req.url.split('/');
  const nome = urlSegments[2]; // Ajuste o índice conforme necessário

  console.log('Nome buscado:', nome);

  try {
      const campeoesComNome = database.select('champions', { nome });
      console.log('Campeões encontrados:', campeoesComNome);

      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(campeoesComNome));
  } catch (error) {
      console.error('Erro ao buscar campeões:', error);
      res.writeHead(500);
      res.end('Erro interno no servidor');
  }
}

function handleGetChampionByName(req, res) {
  const name = req.url.split('/').pop();
  try {
    const champions = database.select('champions', { nome: name });
    if (champions.length > 0) {
      res.writeHead(200).end(JSON.stringify(champions));
    } else {
      res.writeHead(404).end('Campeão não encontrado');
    }
  } catch (error) {
    console.error('Error fetching champion:', error);
    res.writeHead(500).end('Internal Server Error');
  }
}

function handleDeleteManyChampions(req, res) {
  const { championIds } = req.body; // Supondo que o corpo da requisição contém uma lista de IDs

  if (!Array.isArray(championIds)) {
    res.writeHead(400).end('Dados inválidos');
    return;
  }

  try {
    championIds.forEach(id => database.delete('champions', id));
    res.writeHead(200).end('Campeões removidos com sucesso');
  } catch (error) {
    console.error('Error deleting champions:', error);
    res.writeHead(500).end('Internal Server Error');
  }
}

function extrairEArmazenarAspectos() {
    const campeoes = database.select('champions');
    const aspectosComCampeoes = {};

    campeoes.forEach(campeao => {
        campeao.aspectos.forEach(aspecto => {
            if (!aspectosComCampeoes[aspecto]) {
                aspectosComCampeoes[aspecto] = [];
            }
            aspectosComCampeoes[aspecto].push(campeao.nome);
        });
    });

    // Salvar os aspectos e os campeões correspondentes em uma nova tabela (por exemplo, 'aspectosComCampeoes')
    for (const [aspecto, nomes] of Object.entries(aspectosComCampeoes)) {
        database.insert('aspectosComCampeoes', { aspecto, nomes });
    }
}

function atualizarTabelaAspectosComNovoCampeao(champion) {
  let aspectosComCampeoes = database.select('aspectosComCampeoes') || [];

  champion.aspectos.forEach(aspecto => {
      let index = aspectosComCampeoes.findIndex(a => a.aspecto === aspecto);

      if (index !== -1) {
          // Adiciona o nome do campeão ao array existente
          aspectosComCampeoes[index].nomes.push(champion.nome);
      } else {
          // Cria uma nova entrada para o aspecto
          aspectosComCampeoes.push({ aspecto, nomes: [champion.nome] });
      }
  });

  // Substitui a tabela 'aspectosComCampeoes' com os novos dados
  database.update('aspectosComCampeoes', aspectosComCampeoes);
}

function atualizarTabelaAspectosAposDelecao(campeaoDeletado) {
  let aspectosComCampeoes = database.select('aspectosComCampeoes') || [];

  aspectosComCampeoes.forEach(aspectoComCampeoes => {
      // Remove o nome do campeão da lista de cada aspecto
      aspectoComCampeoes.nomes = aspectoComCampeoes.nomes.filter(nome => nome !== campeaoDeletado.nome);
  });

  // Atualiza a tabela de aspectos no banco de dados
  database.update('aspectosComCampeoes', aspectosComCampeoes);
}

function handleGetAllAspectos(req, res) {
  try {
      const todosOsAspectos = obterTodosOsAspectos();
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(todosOsAspectos));
  } catch (error) {
      console.error('Erro ao buscar aspectos:', error);
      res.writeHead(500);
      res.end('Erro interno no servidor');
  }
}

function obterTodosOsAspectos() {
  const aspectosComCampeoes = database.select('aspectosComCampeoes') || [];
  return aspectosComCampeoes.map(entry => entry.aspecto);
}



export const routes = [
  {
    method: 'GET',
    path: buildRoutePath('/dev'),
    handler: extrairEArmazenarAspectos
},  
    {
        method: 'GET',
        path: buildRoutePath('/champions'),
        handler: handleGetChampions
    },
    {
        method: 'GET',
        path: buildRoutePath('/championsTotal'),
        handler: handleCountChampions
    },
    {
        method: 'POST',
        path: buildRoutePath('/champions'),
        handler: handleCreateChampion
    },
    {
        method: 'POST',
        path: buildRoutePath('/championsMany'),
        handler: handleCreateManyChampions
    },
    {
        method: 'DELETE',
        path: buildRoutePath('/champions/:id'),
        handler: handleDeleteChampion
    },
    {
        method: 'PUT',
        path: buildRoutePath('/champions/:id'),
        handler: handleUpdateChampion
    },
    {
      method: 'GET',
      path: buildRoutePath('/championsAspecto/:aspecto'),
      handler: handlerGetAspectos
    },  
    {
      method: 'GET',
      path: buildRoutePath('/champions/:nome'),
      handler: handleGetChampionByName
  },
  {
      method: 'DELETE',
      path: buildRoutePath('/champions'),
      handler: handleDeleteManyChampions
  },
  {
      method: 'GET',
      path: buildRoutePath('/champions/:nome'),
      handler: handlerGetNome
  },
  {
    method: 'GET',
    path: buildRoutePath('/aspectos'),
    handler: handleGetAllAspectos
},
];
/* 
8-bit: 2
Maestro: 1
Country: 3
Mixmaster: 1
EDM: 2
Emo: 2
Disco: 3
Hyperpop: 1
ILLBEATS: 1
Jazz: 4
KDA: 3
Pentakill: 3
HeartSteel: 3
Punk: 2
True Damage: 2
Wildcard: 1
Brutamontes: 2
Breakout: 1
Crowd Driver: 2
Ofuscante: 2
Big shot: 2
Edgelord: 3
Carrasco: 2
Mosher: 2
Guardiao: 2
Rapidfire: 2
Sentinela: 2
Enfeitiçador: 3
Superfan: 3
*/

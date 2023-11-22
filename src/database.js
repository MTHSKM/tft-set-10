import fs from 'node:fs/promises';

const databasePath = new URL('../db.json', import.meta.url);

export class Database {
    #database = {};

    constructor() {
        this.init().catch(err => console.error('Erro ao inicializar o banco de dados:', err));
    }

    async init() {
        try {
            const data = await fs.readFile(databasePath, 'utf8');
            this.#database = JSON.parse(data);
        } catch (error) {
            // Considerar ações adicionais aqui, como criar o arquivo se não existir
            this.#persist(); // Persiste um banco de dados vazio se falhar ao carregar
        }
    }

    async #persist() {
        // Implementar debouncing ou throttling se necessário
        try {
            await fs.writeFile(databasePath, JSON.stringify(this.#database, null, 2));
        } catch (error) {
            console.error('Erro ao persistir dados:', error);
        }
    }

    select(table, search = null) {
        let data = this.#database[table] ?? [];
    
        if (search) {
            data = data.filter(row =>
                Object.entries(search).every(([key, value]) =>
                    Array.isArray(row[key]) ? row[key].includes(value) : row[key] === value
                )
            );
        }
        return data;
    }       

    insert(table, data) {
        // Remover '/' dos aspectos se a tabela for 'champions'
        if (table === 'champions' && data.aspectos) {
            data.aspectos = data.aspectos.map(aspecto => aspecto.replace('/', ''));
        }
    
        this.#database[table] = this.#database[table] || [];
        this.#database[table].push(data);
    
        this.#persist();
        return data;
    }
    

    delete(table, id) {
        if (!Array.isArray(this.#database[table])) {
            console.error(`Tabela ${table} não encontrada ou não é um array`);
            return false;
        }

        const index = this.#database[table].findIndex(item => item.id === id);
        if (index === -1) {
            console.error(`Registro com ID ${id} não encontrado na tabela ${table}`);
            return false;
        }

        this.#database[table].splice(index, 1);
        this.#persist();
        return true;
    }

    update(table, id, newData) {
        if (!Array.isArray(this.#database[table])) {
            console.error(`Tabela ${table} não encontrada ou não é um array`);
            return false;
        }

        const item = this.#database[table].find(item => item.id === id);
        if (!item) {
            console.error(`Registro com ID ${id} não encontrado na tabela ${table}`);
            return false;
        }

        Object.assign(item, newData);
        this.#persist();
        return true;
    }
}

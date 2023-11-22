import { Duplex } from 'node:stream'

class OneToHundredStream extends Duplex {
    index = 1;

    _read() {
        const i = this.index++;

        setTimeout(() => {
            if (i > 5) {
                this.push(null); // Sinaliza o fim da leitura.
            } else {
                const buf = Buffer.from(String(i));
                this.push(buf); // Empurra o dado para ser lido.
            }
        }, 1000);
    }

    _write(chunk, encoding, callback) {
        // Implementação básica para o método write.
        console.log(chunk.toString());
        callback();
    }
}

// ... sua classe OneToHundredStream ...

const stream = new OneToHundredStream();

fetch('http://localhost:3334', {
    method: 'POST',
    body: stream,
    duplex: 'half', // Adicionando a opção duplex
}).then(response => {
    response.text().then(data => {
        console.log(data)
    })
})
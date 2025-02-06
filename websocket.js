// websocket.js
const WebSocket = require('ws');

class WebSocketServer {
    constructor(server) {
        this.wss = new WebSocket.Server({ server });
        this.state = {
            ledState: false,
            lastCall: null,
            connectedClients: new Set()
        };

        this.setupWebSocket();
    }

    setupWebSocket() {
        this.wss.on('connection', (ws) => {
            console.log('Novo cliente WebSocket conectado');
            this.state.connectedClients.add(ws);

            // Envia o estado atual para o novo cliente
            this.sendState(ws);

            ws.on('message', (message) => this.handleMessage(ws, message));
            
            ws.on('close', () => {
                console.log('Cliente WebSocket desconectado');
                this.state.connectedClients.delete(ws);
            });

            ws.on('error', (error) => {
                console.error('Erro na conexão WebSocket:', error);
                this.state.connectedClients.delete(ws);
            });
        });
    }

    handleMessage(ws, message) {
        try {
            const data = JSON.parse(message.toString());
            console.log('Mensagem recebida:', data);

            switch (data.type) {
                case 'toggleYellowLed':
                    this.handleLedToggle();
                    break;
                case 'newCall':
                    this.handleNewCall(data.data);
                    break;
                default:
                    console.log('Tipo de mensagem desconhecido:', data.type);
            }
        } catch (error) {
            console.error('Erro ao processar mensagem:', error);
        }
    }

    handleLedToggle() {
        this.state.ledState = !this.state.ledState;
        this.broadcast({
            type: 'ledUpdate',
            data: { ledState: this.state.ledState }
        });
    }

    handleNewCall(callData) {
        this.state.lastCall = callData;
        this.broadcast({
            type: 'newCall',
            data: callData
        });
    }

    sendState(ws) {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                type: 'initialState',
                data: {
                    ledState: this.state.ledState,
                    lastCall: this.state.lastCall
                }
            }));
        }
    }

    broadcast(message) {
        const messageStr = JSON.stringify(message);
        this.state.connectedClients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(messageStr);
            }
        });
    }
}

module.exports = WebSocketServer;
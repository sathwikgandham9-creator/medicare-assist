import { Response } from 'express';

interface SSEClient {
  id: string;
  userId: number;
  role: 'elderly' | 'caregiver';
  patientId?: number; // if caregiver is watching a specific patient
  res: Response;
}

class SSEManager {
  private clients: SSEClient[] = [];

  constructor() {
    // Keep alive ping every 25s
    setInterval(() => {
      this.broadcastComment('keep-alive');
    }, 25000);
  }

  addClient(id: string, userId: number, role: 'elderly' | 'caregiver', res: Response, patientId?: number) {
    this.clients.push({ id, userId, role, patientId, res });

    // Send connected message
    res.write(`event: connected\ndata: ${JSON.stringify({ message: 'Connected to real-time alert stream', userId, role })}\n\n`);

    res.on('close', () => {
      this.removeClient(id);
    });
  }

  removeClient(id: string) {
    this.clients = this.clients.filter((c) => c.id !== id);
  }

  // Send to caregivers monitoring this elderly user
  broadcastToCaregiversOf(elderlyId: number, event: string, data: any) {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const client of this.clients) {
      if (client.role === 'caregiver' && (!client.patientId || client.patientId === elderlyId)) {
        try {
          client.res.write(payload);
        } catch (err) {
          console.error('Error sending SSE to caregiver', client.id, err);
        }
      }
    }
  }

  // Send directly to the elderly patient
  broadcastToPatient(elderlyId: number, event: string, data: any) {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const client of this.clients) {
      if (client.userId === elderlyId) {
        try {
          client.res.write(payload);
        } catch (err) {
          console.error('Error sending SSE to patient', client.id, err);
        }
      }
    }
  }

  broadcastComment(comment: string) {
    for (const client of this.clients) {
      try {
        client.res.write(`: ${comment}\n\n`);
      } catch (err) {
        // ignore
      }
    }
  }
}

export const sseManager = new SSEManager();

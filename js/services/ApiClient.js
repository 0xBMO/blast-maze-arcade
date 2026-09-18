export class ApiClient {
    static async getScores() {
        try {
            const res = await fetch('/api/scores');
            if (!res.ok) throw new Error('Error al consultar puntuaciones');
            return await res.json();
        } catch (err) {
            console.error('Fallo en GET /api/scores:', err);
            return [];
        }
    }

    static async saveScore(scoreData) {
        try {
            const res = await fetch('/api/scores', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(scoreData)
            });
            return await res.json();
        } catch (err) {
            console.error('Fallo en POST /api/scores:', err);
            return null;
        }
    }
}
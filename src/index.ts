import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import { createRepositories } from './api/supabase/client';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const repos = createRepositories();

app.get('/', (req: Request, res: Response) => {
    res.send('Express + TypeScript Server');
});

app.get('/test-supabase', async (req: Request, res: Response) => {
    try {
        const { data, error } = await repos.users.findAll(undefined, { limit: 1 });
        if (error) throw error;
        res.json({ message: 'Supabase connection successful', data });
    } catch (error: any) {
        res.status(500).json({ message: 'Supabase connection failed', error: error.message });
    }
});

app.listen(port, () => {
    console.log(`[server]: Server is running at http://localhost:${port}`);
});

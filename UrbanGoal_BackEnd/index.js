import express from 'express';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(express.json());

// Endpoint de prueba
app.get('/', (req, res) => {
  res.send('UrbanGoal Backend funcionando');
});

// Endpoint para recibir órdenes
app.post('/api/orders', (req, res) => {
  const order = req.body;
  console.log('Orden recibida:', order);
  // Aquí podrías guardar la orden en una base de datos
  res.status(201).json({ message: 'Orden recibida', order });
});

app.listen(PORT, () => {
  console.log(`Servidor backend escuchando en puerto ${PORT}`);
});

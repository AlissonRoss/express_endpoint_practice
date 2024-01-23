const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const uuid = require('uuid');
const app = express();

require('dotenv').config();

const port = process.env.PORT;

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  port: process.env.DB_PORT,
});


app.use(async function(req, res, next) {
  try {
    req.db = await pool.getConnection();
    req.db.connection.config.namedPlaceholders = true;

    await req.db.query(`SET SESSION sql_mode = "TRADITIONAL"`);
    await req.db.query(`SET time_zone = '-8:00'`);

    await next();

    req.db.release();
  } catch (err) {
    console.log(err);

    if (req.db) req.db.release();
    throw err;
  }
});

app.use(cors());

app.use(express.json());
//GETS all Cars
app.get('/car', async function(req, res) {
  try {
    console.log('/car/:id')
    const [q] = await pool.query('SELECT * FROM `car`' );
    res.json(q);
  } catch (err) {
    res.status(400).json({msg: 'Error getting all cars'})
  }
});
//GET ONE car
app.get('/car/:id', async function (req, res) {
  try{
    const id = req.params.id;
    const [q] = await pool.query('SELECT * FROM `car` WHERE id=:id', {id} );
    res.json(q);
  }catch(err){
    res.status(400).json({msg: 'Error getting car at', data:id})
  }
  
});

app.use(async function(req, res, next) {
  try {
    console.log('Middleware after the get /cars');
  
    await next();

  } catch (err) {

  }
});
//CREATE new car
app.post('/car', async function(req, res) {
  try {
    const { make, model, year } = req.body;
    
    const query = await req.db.query(
      `INSERT INTO car (make, model, year) 
       VALUES (:make, :model, :year)`,
      {
        id: uuid.v4(),
        make: make,
        model: model,
        year: year,
        deleted_flag: 0,
      }
    );
    
    res.status(200).json({ success: true, message: 'Car successfully created', data: req.body});
  } catch (err) {
    res.status(400).json({ success: false, message: `ERROR:` + err, data: null })
  }
});
//DELETE car
//using http://localhost:3000/car/id
app.delete('/car/:id', async function(req,res) {
  const id = req.params.id;
  const deleted_flag = 1;
  const query = 'UPDATE `car` SET deleted_flag=:deleted_flag WHERE id=:id';
  try {
    
    await pool.query(query,{deleted_flag, id});
    res.status(200).json({success: true, message:'SUCCESS Car successfully deleted', data: deleted_flag});
    
    console.log('req.params /car/:id', deleted_flag)
  
  } catch (err) {
    res.status(400).json({success: false, message:'FAILED to delete car', data: err});
  }
});
//UPDATE CAR
//Does require all three make model and year to be sent to the server
app.put('/car/:id', async function(req,res) {
  const id = req.params.id;
  const { make, model, year } = req.body;
  try {
    const query = 'UPDATE `car` SET make=:make, model=:model, year=:year WHERE id=:id';
    await pool.query(query, {
      make,
      model,
      year,
      id
  });
  //UpdatedCar returns the response data from the database with the specified id
  const updatedCar = await pool.query('SELECT * FROM `car` WHERE id=:id', {id});
  res.status(200).json({success: true, message:'SUCCESS Car successfully updated', data: updatedCar[0]});
  } catch (err) {
    res.status(400).json({success: false, message:'FAILED to update car', data: err});
  }
});


app.listen(port, () => console.log(`212 API Example listening on http://localhost:${port}`));
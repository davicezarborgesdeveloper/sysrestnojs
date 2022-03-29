const express = require("express");
const port = process.env.PORT || 9000;
const compression = require("compression");
const path = require("path");
const app = express();
app.use(express.urlencoded());
app.use(express.json());
app.set("views", path.join(__dirname, "static", "views"));
app.set("view engine", "ejs");
app.use(compression());
app.use("/public", express.static(path.join(__dirname, "static", "public")));
var admin = require("firebase-admin");
var serviceAccount = require("./serviceAccountKey.json");
var Request = require("request");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

let db = admin.firestore();

app.get("/sysrest/api/datahora", async function (req, res) {
  let date_ob = new Date();
  let date = ("0" + date_ob.getDate()).slice(-2);
  let month = ("0" + (date_ob.getMonth() + 1)).slice(-2);
  let year = date_ob.getFullYear();
  let hours = date_ob.getHours();
  let minutes = date_ob.getMinutes();
  let seconds = date_ob.getSeconds();
  let formatDate =
    date +
    "/" +
    month +
    "/" +
    year +
    " " +
    hours +
    ":" +
    minutes +
    ":" +
    seconds;
  res.send({ status: "success", resultado: formatDate });
});

app.post("/sysrest/api/login", async function (req, res) {
  var fs = require('fs');
  let rawdata = fs.readFileSync('users.json');
    
  let users = JSON.parse(rawdata);
  let hasClient = false;
  let authenticated = users.find(u => u['codOp'] === req.body.codOp && u['password'] === req.body.password);
  if(typeof authenticated !== "undefined"){
    res.status(200).json({
    success: true,
    result: { name: authenticated["name"], codOp: authenticated['codOp'] },
    });
  }else{
    res.status(401).json({
    success: false,
    result: null,
    message: "Erro de usuário e/ou senha",
  });
  }
  // users.forEach(function (item, indice, array) {
  //   if(req.body.codOp == item['codOp'] && req.body.password == item['password']){
  //     hasClient = true;
  //   }
  // });
});

app.get("/sysrest/api/getMesas", async function (req, res){
  var fs = require('fs');
  let rawdata = fs.readFileSync('tables.json');
  let tables = JSON.parse(rawdata);
  res.status(200).json({
    "success": true,
    "result": tables,
  });
});

app.get("/sysrest/api/getCategorias", async function (req, res){
  var fs = require('fs');
  let rawdata = fs.readFileSync('category.json');
  let tables = JSON.parse(rawdata);
  res.status(200).json({
    "success": true,
    "result": tables,
  });
});

app.get("/sysrest/api/getTodosProdutos", async function (req, res){
  var fs = require('fs');
  let rawdata = fs.readFileSync('products.json');
  let products = JSON.parse(rawdata);
  res.status(200).json({
    "success": true,
    "result": products,
  });
});

app.get("/sysrest/api/getProdutosPorCategoria", async function (req, res){
  var fs = require('fs');
  let rawdata = fs.readFileSync('products.json');
  let products = JSON.parse(rawdata);


  if(req.query.categoria != null){
    const filtered = products.filter(element => element['category']===req.query.categoria);
    res.status(200).json({
      "success": true,
      "result": filtered,
    });
  }else{
    res.status(200).json({
      "success": true,
      "result": products,
    });
  }
});

app.get("/sysrest/api/getProdutosPorMesa", async function (req, res) {
  var fs = require('fs');
  let tableFile = fs.readFileSync('tables.json');
  let productFile = fs.readFileSync('products.json');

  if(req.query.table!= "null"){
    var query = req.query.table;
    let tablesF = JSON.parse(tableFile);
    let productsF = JSON.parse(productFile);
    let list = [];

    let table = tablesF.find(t => t['number'] == query)['products'];
    table.forEach(function (item, index, array) {
      let obj = productsF.find(p => p['code']===item['productId']);
      obj.quantity = item['qtd'];
      list.push(obj);
    });
   
    res.status(200).json({
      "success": true,
      "result":list,
      });
  }else{
    res.status(417).json({
      "success": false,
      "message": "Faltam dados a serem informados",
    });
  }
});

app.get("/sysrest/api/getProduto", async function (req, res) {
  var fs = require('fs');

  if(req.query.id != null){
    let productFile = fs.readFileSync('products.json');
    let productsObj = JSON.parse(productFile);
    let obj = productsObj.find(p => p['code'] == req.query.id);

  res.status(200).json({
    "success": true,
    "result":obj,
    });

  }else{
    res.status(417).json({
      "success": false,
      "message": "Faltam dados a serem informados",
    });
  }
});



app.listen(port, function () {
  console.log(`Servidor Web rodando na porta ${port}`);
});

// app.get("/sysrest/api/criaMesas", async function (req, res) {
//   let collectionName = "restaurantTables";
//   if (req.query.qtd != null && req.query.qtd > 0) {
//     let querySnapshot = await db.collection(collectionName).get();
//     if (querySnapshot.empty) {
//       try{
//         for(let i = 0; i < req.query.qtd;i++){
//           await db.collection(collectionName).doc(`${i+1}`).set({
//             number: `${i+1}`,
//             lugares: 4,
//             status: 0,
//             total: "0.00",
//           });
//           console.log(`Completado ${i+1}`);
//         }
//         res
//         .status(200)
//         .json({ success: true, message: "Mesas geradas com sucesso" });
//       }catch(e){
//         console.log(e);
//         res
//         .status(417)
//         .json({ success: false, message: "Erro ao gerar mesas" });
//       }
      
//     } else {
//       try{
//         const table = await db.collection(collectionName).get();
//         let initIndex = table.docs.length+1;
//         for(let i = 0; i < req.query.qtd;i++){
//           await db.collection(collectionName).doc(`${initIndex+i}`).set({
//             number: `${initIndex+i}`,
//             lugares: 4,
//             status: 0,
//             total: "0.00",
//           });
//           console.log(`Completado ${i+1}`);
//         }
//         res
//         .status(200)
//         .json({ success: true, message: "Mesas geradas com sucesso" });
//       }catch(e){
//         res
//         .status(417)
//         .json({ success: false, message: "Erro ao gerar mesas" });
//       }
      
//     }
//   } else {
//     res
//       .status(417)
//       .json({ success: false, result: null, message: "Quantidade inválida" });
//   }
// });
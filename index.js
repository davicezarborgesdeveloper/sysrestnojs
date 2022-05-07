const express = require("express");
const port = 9000;
const compression = require("compression");
const path = require("path");
const app = express();
app.use(express.urlencoded());
app.use(express.json());
app.set("views", path.join(__dirname, "static", "views"));
app.set("view engine", "ejs");
app.use(compression());
app.use("/public", express.static(path.join(__dirname, "static", "public")));
var fs = require('fs');
var fileTable = "tables.json";
var fileManager = "manager.json";
var fileCategory = "category.json";
var fileProduct = "products.json";

function requestStatus(res,stNumber,stBool,result,msg){
  if(result != null){
    res.status(stNumber).json({
      "success": stBool,
      "result":result,
      "message":msg
    });
  }else{
    res.status(stNumber).json({
      "success": stBool,
      "message":msg
    });
  }
}

function addProduct(objList,index,produto){
  if(typeof objList[index]['products'] == "undefined"){
    var products = [];
    products.push(produto);
    objList[index]['products'] = products;
  }else {
    objList[index]['products'].push(produto)
  }
  objList[index]['status'] = 1;
  objList[index]=calculaTotal(objList[index]);
  return objList;
}

function updateRegister(objList,type){
  var data = [];
  objList.forEach(function (item, index, array) {
    data.push(item);
  });
  const file = fs.createWriteStream(type === "TABLE"?fileTable:fileManager);
  file.write(JSON.stringify(data));
  file.end();
}

function calculaTotal(object){
  let price = 0.00;
  object['products'].forEach(function (item, index, array) {
    const productFile = fs.readFileSync(fileProduct);
    let products = JSON.parse(productFile);
    let indexProduct = products.findIndex(o =>o['code']===item["code"]);
    price += parseFloat(products[indexProduct]['price'])*item['qtd'];
  });
  object["total"] = `${price.toFixed(2)}`;
  return object;
}

function changeListProduct(objList,indexFrom,indexTo,productList){
  
  for(let i = 0; i < productList.length; i++){
    // retirar produtos
    indexDelProduct = objList[indexFrom]['products'].findIndex(prod => prod['productId'] === productList[i]['productId']);
    objList[indexFrom]['products'].splice(indexDelProduct,1);
    // inclui produtos
    var products = [];
    if(typeof objList[indexTo]['products'] == "undefined"){
      
      products.push(productList[i]);
      
      objList[indexTo]['products'] = products;
    }else{
      products = objList[indexTo]['products'];
      products.push(productList[i]);
    }
  }
  
  if(objList[indexFrom]['products'].length == 0){
    objList[indexFrom]['status'] = 0;
    objList[indexFrom]['total'] = "0.00";
    delete objList[indexFrom]['products'];
  }else{
    objList[indexFrom]=calculaTotal(objList[indexFrom]);
  }
  objList[indexTo]['status'] = 1;
  objList[indexTo]=calculaTotal(objList[indexTo]);

  return objList;

}

function print(text){
  console.log(text);
}



// Serviços
app.get("/sysrest/api/criar", async function (req, res) {
  if(req.query.qtd != null && req.query.op != null){
    var qtd = req.query.qtd;
    var fileName = req.query.op == 't'?fileTable:fileManager;
    const file = fs.createWriteStream(fileName);
    data = [];
    for(let i = 0; i < qtd; i++){
      if(req.query.op === 't'){
        data.push({
          "number":`${(i+1)<10?'0'+(i+1):(i+1)}`,
          "lugares": 4,
          "status": 0,
          "total": "0.00",
        });
      }else{
        data.push({
          "number":`${(i+1)<10?'0'+(i+1):(i+1)}`,
          "status": 0,
          "total": "0.00",
        });
      }
    }

    file.write(JSON.stringify(data));
    file.end();
    requestStatus(res,200,true,null,"Mesas geradas com sucesso");
  }else{
    requestStatus(res,500,false,null,"Parâmetros requeridos");
  }
});


app.get("/sysrest/api/getMesas", async function (req, res){
  let rawdata = fs.readFileSync(fileTable);
  let obj = JSON.parse(rawdata);
  requestStatus(res,200,true,obj,"Mesas recuperadas com sucesso");
});

app.get("/sysrest/api/getComanda", async function (req, res){
  let rawdata = fs.readFileSync(fileManager);
  let obj = JSON.parse(rawdata);
  requestStatus(res,200,true,obj,"Comandas recuperadas com sucesso");
});

app.get("/sysrest/api/getCategorias", async function (req, res){
  let rawdata = fs.readFileSync(fileCategory);
  let obj = JSON.parse(rawdata);
  requestStatus(res,200,true,obj,"Categorias recuperadas com sucesso");
});

app.get("/sysrest/api/getTodosProdutos", async function (req, res){
  let rawdata = fs.readFileSync(fileProduct);
  let obj = JSON.parse(rawdata);
  requestStatus(res,200,true,obj,"Produtos recuperados com sucesso");
});

app.get("/sysrest/api/getProdutosPorCategoria", async function (req, res){
  let rawdata = fs.readFileSync(fileProduct);
  let products = JSON.parse(rawdata);

  if(req.query.categoria != null){
    const filtered = products.filter(element => element['category']===req.query.categoria);
    requestStatus(res,200,true,filtered,"Produtos recuperados com sucesso");
  }else{
    requestStatus(res,200,true,products,"Produtos recuperados com sucesso");
  }
});

app.get("/sysrest/api/getProduto", async function (req, res) {
  if(req.query.id != null){
    let productsObj = JSON.parse(fs.readFileSync(fileProduct));
    let obj = productsObj.find(p => p['code'] == req.query.id);
    requestStatus(res,200,true,obj,"Produto recuperado com sucesso");
  }else{
    requestStatus(res,417,false,null,"Faltam dados a serem informados");
  }
});

app.get("/sysrest/api/getProdutosPor", async function (req, res) {
  if(req.query.table== null && req.query.manager == null){
    requestStatus(res,417,false,null,"Faltam dados a serem informados");
  }else{
    let products = JSON.parse(fs.readFileSync(fileProduct));
    let list = [];
    if(req.query.table!= null){
      var tableQuery = req.query.table;
      let tables = JSON.parse(fs.readFileSync(fileTable));
      let table = tables.find(t => parseInt(t['number']) == parseInt(tableQuery))["products"];
      if(typeof table === "undefined"){        
        requestStatus(res,200,true,null,"Mesa Vazia");
      }else{
        table.forEach(function (item, index, array) {
          var obj = 'null';
          obj = products.find(p => p['code']===item['code']);
          list.push({
            "code":item['code'],
            "name": obj["name"],
            "price": obj["price"],
            "category": obj["category"],
            "requestQuantity": obj["requestQuantity"],
            "allowsCombination": obj["allowsCombination"],
            "image": obj["image"],
            "imageCategory": obj["imageCategory"],
            "productId":item['productId'],
            "quantity": item['qtd']
          });
        });
        requestStatus(res,200,true,list,"Produtos da Mesa recuperado com sucesso");
      }
    }

    if(req.query.manager!= null){
      var managerQuery = req.query.manager;
      let managers = JSON.parse(fs.readFileSync(fileManager));
      let manager = managers.find(m => parseInt(m['number']) == parseInt(managerQuery))["products"];
      if(typeof manager === "undefined"){        
        requestStatus(res,200,true,null,"Comanda Vazia");
      }else{
        manager.forEach(function (item, index, array) {
          var obj = 'null';
          obj = products.find(p => p['code']===item['code']);
          list.push({
            "code":item['code'],
            "name": obj["name"],
            "price": obj["price"],
            "category": obj["category"],
            "requestQuantity": obj["requestQuantity"],
            "allowsCombination": obj["allowsCombination"],
            "image": obj["image"],
            "imageCategory": obj["imageCategory"],
            "productId":item['productId'],
            "quantity": item['qtd']
          });
        });
        requestStatus(res,200,true,list,"Produtos da Comanda recuperado com sucesso");
      }

    }
  }
  
});

app.post("/sysrest/api/addProduct", async function (req, res) {
  const { v4: uuidv4 } = require('uuid');
  if((req.body.table != null || req.body.manager != null) && req.body.code != null && req.body.qtd != null){
    let products = JSON.parse(fs.readFileSync(fileProduct));
    var data = [];
    var type = req.body.table != null?"TABLE":"MANAGER";
    var number = type==="TABLE"?req.body.table:req.body.manager;

    let obj = JSON.parse(fs.readFileSync(type==="TABLE"?fileTable:fileManager));
    let index = obj.findIndex(t =>t['number'] === number);
    let indexProduct =  products.findIndex(prod =>prod['code']===req.body.code);
    if(index != -1 && indexProduct != -1){
      var produto = {"productId":`${uuidv4()}`,"code":`${req.body.code}`,"unitPrice":`${products[indexProduct]["price"]}`,"qtd":req.body.qtd}
      updateRegister(addProduct(obj,index,produto),type);
      requestStatus(res,200,true,null,"produto adicionado com sucesso");
    }else{
      requestStatus(res,500,false,null,"Mesa e/ou produto inexistentes");
    }
  }else{
    requestStatus(res,417,false,null,"Faltam dados a serem informados");
  }
});

app.post("/sysrest/api/delProduct", async function (req, res) {
  if((req.body.table != null || req.body.manager != null) && req.body.productId != null){
    var number = req.body.table != null?req.body.table:req.body.manager;
    var type = req.body.table != null?"TABLE":"MANAGER";
    let objList = JSON.parse(fs.readFileSync(req.body.table != null?fileTable:fileManager));
    let index = objList.findIndex(o =>o['number']===number);
    if(index != -1){
      if(typeof objList[index]['products'] !== "undefined"){
        let indexProduct = objList[index]['products'].findIndex(p=>p['productId']===req.body.productId);
        if(indexProduct != -1){
          objList[index]['products'].splice(indexProduct,1);
          objList[index]=calculaTotal(objList[index]);
          if(objList[index]['products'].length == 0){
            delete objList[index]['products'];
            objList[index]['status'] = 0;
            objList[index]['total'] = "0.00";
          }
          updateRegister(objList,type);
          requestStatus(res,200,true,null,"produto deletado com sucesso");
        }else{
          requestStatus(res,417,false,null,"produto inexistente inesistente");
        }
      }else{
        requestStatus(res,417,false,null,"produto inexistente inesistente");
      }
      
    }else{
      requestStatus(res,417,false,null,"Mesa ou Comanda inexistente inesistente");
    }
  }else{
    requestStatus(res,417,false,null,"Faltam dados a serem informados");
  }
});


app.get("/sysrest/api/del", async function (req, res) {
  if(req.query.id != null && req.query.type != null){
    var type = req.query.type === 't'?"TABLE":"MANAGER";
    var number = req.query.id;
    let objList = JSON.parse(fs.readFileSync(type==="TABLE"?fileTable:fileManager));
    let index = objList.findIndex(o =>parseInt(o['number'])===parseInt(number));
    if(index != -1){  
      objList[index]['status'] = 0;
      objList[index]['total'] = "0.00";
      delete objList[index]['products'];
      updateRegister(objList,type);
      requestStatus(res,200,true,null,"mesa ou comanda deletada com sucesso");
    }else{
      requestStatus(res,417,false,null,"Mesa ou Comanda inexistente inesistente");
    }
  }else{
    requestStatus(res,417,false,null,"Mesa ou Comanda inexistente inesistente");
  }
});

app.post("/sysrest/api/changeQtdProduct", async function (req, res) {
  if((req.body.table != null || req.body.manager != null) && req.body.productId != null && req.body.op != null){
    var type = req.body.table != null?"TABLE":"MANAGER";
    let objList = JSON.parse(fs.readFileSync(type==="TABLE"?fileTable:fileManager));
    var number = type==="TABLE"?req.body.table:req.body.manager;
    let index = objList.findIndex(o =>o['number']===number);
    if(index != -1){
      if(typeof objList[index]['products'] !== "undefined"){
        let indexProduct = objList[index]['products'].findIndex(p=>p['productId']===req.body.productId);
        if(indexProduct != -1){
          if(req.body.op === "add"){
            objList[index]['products'][indexProduct]['qtd'] += 1;
          }else if(req.body.op === "sub"){ 
            if(objList[index]['products'][indexProduct]['qtd'] === 1){
              objList[index]['products'].splice(indexProduct,1);
              if(objList[index]['products'].length == 0){
                objList[index]['status'] = 0;
                objList[index]['total'] = "0.00";
                delete objList[index]['products'];
              }
            }
            else{
              objList[index]['products'][indexProduct]['qtd'] -= 1;  
            }
          }
          if(typeof objList[index]['products'] !== "undefined")
            objList[index]=calculaTotal(objList[index]);
          updateRegister(objList,type);
          requestStatus(res,200,false,null,"valor atualizado com sucesso");
        }else{
          requestStatus(res,417,false,null,"Produto inexistente");
        }
      }else{
        requestStatus(res,417,false,null,"Produto inexistente");
      }
     
    }else{
      requestStatus(res,417,false,null,"Produto inexistente");
    }
  }else{
    requestStatus(res,500,false,null,"Parametros requeridos");
  }

});

app.post("/sysrest/api/changeProduct", async function (req, res) {
  var body = req.body;
  if(body.from != null && body.to != null && body.productId != null && body.type != null){
    var pidList = body.productId;
    if(body.from !== body.to){
      let objList = JSON.parse(fs.readFileSync(body.type==="TABLE"?fileTable:fileManager));
      let indexFrom = objList.findIndex(obj => obj['number']===body.from);
      let indexTo = objList.findIndex(obj => obj['number']===body.to);
      if(indexFrom != -1 && indexTo != -1){
        let indexProduct = 0;
        let prodFrom = [];
        for(let i = 0; i < pidList.length; i++){
          if(typeof objList[indexFrom]['products'] !== "undefined"){
            indexProduct = objList[indexFrom]['products'].findIndex(prod => prod['productId'] === pidList[i]);
            if(indexProduct !== -1){
              prodFrom.push(objList[indexFrom]['products'][indexProduct]);            
            }else{
              break;
            }
          }else{
            indexProduct =-1;
            break;
          }
        }
        if(indexProduct == -1){
          requestStatus(res,500,false,"produto inexistente na mesa de origem");
        }else{
          objList=changeListProduct(objList,indexFrom,indexTo,prodFrom);
          updateRegister(objList,body.type);
          requestStatus(res,200,true,"Mesas atualizadas com sucesso");
        }

      }else{
        requestStatus(res,500,false,"Origem e/ou destino inexistente(s)");
      }
    }else{
      requestStatus(res,500,false,"A origem e o destino devem ser diferentes");
    }
  }else{
    requestStatus(res,500,false,"Parâmetros requeridos");
  }
});




app.listen(port, function () {
  console.log(`Servidor Web rodando na porta ${port}`);
});


//   Kit festa escolhe 100 salgados escolhe 1 bolo e 3 refrigerantes

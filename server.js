const express = require("express");
const http = require("http");
const socketIO = require("socket.io");
const {coin} = require('./config/contract.js');
const Web3 = require('web3');
const EthereumTx = require('ethereumjs-tx');
const mongoose = require("mongoose");
const passport = require("passport");
const Referral = require('./routes/api/referral');
const cors = require('cors');
const bodyParser = require("body-parser");

const {ethers} = require("ethers");
const port = process.env.PORT || 5000;

const app = express();

app.use(cors());

app.use((_, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept'
  )
  next()
})

app.use(
  bodyParser.urlencoded({
    extended: false
  })
);
app.use(bodyParser.json());

const db = require("./config/keys").mongoURI;


mongoose
  .connect(
    db,
    { useNewUrlParser: true,
      useUnifiedTopology: true,
      useFindAndModify: false  }
  )
  .then(() => console.log("MongoDB successfully connected"))
  .catch(err => console.log(err));

// Passport middleware
app.use(passport.initialize());
const server = http.createServer(app);

const rpcUrl = `https://mainnet.infura.io/v3/0c5409f01bb944168d3bb4b03a674f15`;
const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
const CoinContract = new ethers.Contract(coin.mainnet,coin.abi,provider);

const adminaccount = {
  publicKey:"0x57fF2F45ad17304646276DD0F49A2E01CDE5CA63",
  privateKey:""
}

const adminWallet = new ethers.Wallet(adminaccount.privateKey, provider);

const SignedCoinContract = CoinContract.connect(adminWallet);

// This creates our socket using the instance of the server
const io = socketIO(server);
var clients = [];
io.on("connection", socket => {

  console.log("New client connected " + socket.id);
  socket.on("set winner", async (betData)=>{
    console.log(betData.publicKey);
  
    var amount = Number(betData.profit).toFixed(0);
    
    var tx =await SignedCoinContract.transfer(betData.publicKey,ethers.utils.parseUnits(amount.toString(),coin.decimals));
    if(tx!=null) {
      await tx.wait()   
    }
    // transaction
    io.sockets.emit('users_count', betData);
  
    })

  socket.on("set loser",(betData)=>{
    io.sockets.emit('users_count', betData);
  
    })

  socket.on("set autoBet", async (betData)=>{
    var amount = Number(betData.profit+betData.amount).toFixed(0);
    
    // transaction
    var tx =await SignedCoinContract.transfer(betData.publicKey,ethers.utils.parseUnits(amount.toString(),coin.decimals));
    if(tx!=null) {
      await tx.wait()
    }
    io.sockets.emit('users_count', betData);
  })
  

  // disconnect is fired when a client leaves the server
  socket.on("disconnect", () => {
    console.log("user disconnected");
  });
});

app.use('/api/referral', Referral)

/* Below mentioned steps are performed to return the Frontend build of create-react-app from build folder of backend */

server.listen(port, () => console.log(`Listening on port ${port}`));

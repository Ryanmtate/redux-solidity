import DeployEngine from '../../src/contractDeployEngine';
import { name, directory } from '../test_contracts/config';
import Web3 from 'web3';
const web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545'));



let engine = new DeployEngine({
  name,
  directory,
  web3,
  params : [
    // "0x34a4d6c830193f0244364a1711b182868c9feda9",
    // ["0xbd9611ea1674f2e4b1784e7a923675f65ea07afe", "0x24d24bb4e500cdc31ae4f508acff2494ec5f14ae"]
  ],
  sendObject : {
    from : web3.eth.accounts[0],
    gas : 4712388
  }
});



// engine.deploy().then((deployed) => {
//   console.log(engine.contract)
//   return engine.saveDeployed();
// }).then((saved) => {
//   console.log(saved);
// }).catch((error) => {
//   console.log(error);
// });

const deployedCase = require('../test_contracts/Case.deployed.json');

// console.log(deployedCase);

engine.initDeployed(deployedCase).then((contract) => {
  console.log(contract);
}).catch((error) => {
  console.log(error);
})

import Promise from 'bluebird';
import async from 'async';
import StateEngine from './stateEngine';
import solc from 'solc';

const fs = Promise.promisifyAll(require('fs'));
const join = Promise.join;
const jsonfile = Promise.promisifyAll(require('jsonfile'));

export default class DeployEngine extends StateEngine {
  constructor(options){
    super(options);
    this.directory = options.directory
    this.compiled = {};
    this.deployed = {};
    this.params = options.params;
  }

  compile() {
    return new Promise((resolve, reject) => {
      let sources = new Object();
      fs.readdirAsync(`${this.directory}/src`).map((file) => {
        return join(file, fs.readFileAsync(`${this.directory}/src/${file}`, `utf-8`), (file, src) => {
          sources[file] = src;
        });
      }).then(() => {
        return solc.compile({sources : sources}, 1);
      }).then((compiled) => {
        if(!compiled.contracts){
          reject(compiled);
        } else {
          this.compiled = compiled;
          resolve(compiled);
        }
      }).catch((error) => {
        reject(error);
      });
    });
  }

  saveCompiled() {
    return new Promise((resolve, reject) => {
      jsonfile.writeFileAsync(`${this.directory}/compiled.json`, this.compiled).then(() => {
        resolve(true);
      }).catch((error) => {
        reject(error);
      })
    })
  }

  getCompiled() {
    return new Promise((resolve, reject) => {
      jsonfile.readFileAsync(`${this.directory}/compiled.json`).then((compiled) => {
        this.compiled = compiled;
        this.abi = JSON.parse(compiled['contracts'][this.name]['interface']);
        this.bytecode = compiled['contracts'][this.name]['bytecode'];
        resolve(compiled);
      }).catch((error) => {
        reject(error);
      })
    })
  }

  deploy() {
    return new Promise((resolve, reject) => {
      this.deployed = new Object();
      this.compile().then((compiled) => {
        this.deployed = compiled['contracts'][this.name];
        this.abi = JSON.parse(compiled['contracts'][this.name]['interface']);
        this.bytecode = compiled['contracts'][this.name]['bytecode'];
        return this.eth.contract(this.abi);
      }).then((contract) => {
        this.sendObject['data'] = this.bytecode;
        if(typeof this.params == 'undefined' || this.params.length == 0){
          return contract.new(this.sendObject);
        } else {
          return contract.new(...this.params, this.sendObject);
        };
      }).then((result) => {
        return this.getTransactionReceipt(result['transactionHash']);
      }).then((txReceipt) => {
        this.deployed['txReceipt'] = txReceipt;
        resolve(this.deployed);
      }).catch((error) => {
        reject(error);
      });
    })
  }

  saveDeployed() {
    return new Promise((resolve, reject) => {
      jsonfile.writeFileAsync(`${this.directory}/${this.name}.deployed.json`, this.deployed).then(() => {
        resolve(true);
      }).catch((error) => {
        reject(error);
      });

    });
  }

}
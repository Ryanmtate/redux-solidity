import Promise from 'bluebird';
import async from 'async';
import StateEngine from '../dist/StateEngine';
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
    this.libraries = options.libraries || {};
  }

  compile() {
    return new Promise((resolve, reject) => {
      let sources = new Object();
      fs.readdirAsync(`${this.directory}`).map((file) => {
        if(file.match(RegExp(".sol"))){
          return join(file, fs.readFileAsync(`${this.directory}/${file}`, `utf-8`), (file, src) => {
            sources[file] = src;
          });
        }
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
        return this.linkBytecode(compiled['contracts'][this.name]['bytecode']);
      }).then((bytecode) => {
        this.bytecode = bytecode;
        this.sendObject['data'] = this.bytecode;
        return this.eth.contract(this.abi);
      }).then((contract) => {
        if(typeof this.params == 'undefined' || this.params.length == 0){
          return contract.new(this.sendObject);
        } else {
          return contract.new(...this.params, this.sendObject);
        };
      }).then((result) => {
        return this.getTransactionReceipt(result['transactionHash']);
      }).then((txReceipt) => {
        this.deployed['txReceipt'] = txReceipt;
        this.deployed['bytecode'] = this.bytecode;
        this.deployed['runtimeBytecode'] = this.bytecode;
        this.address = txReceipt['contractAddress'];
        return this.saveDeployed();
      }).then((saved) => {
        this.contract = this.eth.contract(this.abi).at(this.address);
        return this.promisify();
      }).then((contract) => {
        this.contract = contract;
        resolve(this.contract);
      }).catch((error) => {
        reject(error);
      });
    })
  }

  saveDeployed(name, deployed) {
    return new Promise((resolve, reject) => {
      let Deployed = deployed || this.deployed;
      let Name = name || this.name;
      Promise.resolve(fs.existsSync(`${this.directory}/deployed/`)).then((exists) => {
        if(!exists){
          return fs.mkdirAsync(`${this.directory}/deployed/`);
        } else {
          return true;
        }
      }).then(() => {
        return jsonfile.writeFileAsync(`${this.directory}/deployed/${Name}.deployed.json`, Deployed);
      }).then(() => {
        resolve(true);
      }).catch((error) => {
        reject(error);
      });

    });
  }

  linkBytecode(bytecode) {
    return new Promise((resolve, reject) => {
      let lib = bytecode.match(RegExp("__"));
      if(!bytecode){
        let error = new Error('Invalid Bytecode.');
      } else if(!lib){
        this.bytecode = bytecode;
        resolve(this.bytecode);
      } else {
        this.deployAndReplace(lib).then((bytecode) => {
          this.bytecode = bytecode;
          resolve(bytecode);
        }).catch((error) => {
          reject(error);
        });
      }
    });
  }

  deployAndReplace(lib) {
    return new Promise((resolve, reject) => {
      let index = lib['index'];
      let bytecode = lib['input'];
      let placeholder = bytecode.slice(index, index+40);
      this.findAndDeployLibrary(placeholder).then((libraries) => {
        this.bytecode = solc.linkBytecode(bytecode, libraries);
        return this.linkBytecode(this.bytecode);
      }).then((bytecode) => {
        resolve(bytecode);
      }).catch((error) => {
        reject(error);
      })
    })
  }

  findAndDeployLibrary(placeholder) {
    return new Promise((resolve, reject) => {
      let library;
      let deployed;
      fs.readdirAsync(`${this.directory}/contracts`).map((file) => {
        let target = file.replace('.sol', '');
        let m = placeholder.match(new RegExp(target))
        if(m){
          library = target;
        }
      }).then(() => {
        if(!library){
          let error = new Error('Library was not found in source folder!!');
          reject(error);
        } else {
          deployed = this.compiled['contracts'][library];
          let abi = JSON.parse(this.compiled['contracts'][library].interface);
          let bytecode = this.compiled['contracts'][library]['bytecode'];
          let contract = this.eth.contract(abi);
          this.sendObject['data'] = bytecode;

          return contract.new(this.sendObject);
        }
      }).then((contract) => {
        return this.getTransactionReceipt(contract['transactionHash']);
      }).then((txReceipt) => {
        deployed['txReceipt'] = txReceipt;
        return this.saveDeployed(library, deployed);
      }).then((saved) => {
        this.libraries[library] = deployed['txReceipt']['contractAddress'];
        resolve(this.libraries);
      }).catch((error) => {
        reject(error);
      });
    })
  }


}

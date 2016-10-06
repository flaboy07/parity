// Copyright 2015, 2016 Ethcore (UK) Ltd.
// This file is part of Parity.

// Parity is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// Parity is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with Parity.  If not, see <http://www.gnu.org/licenses/>.

import Registry from './registry';
import SignatureReg from './signaturereg';
import TokenReg from './tokenreg';

let instance = null;

export default class Contracts {
  constructor (api) {
    instance = this;

    this._api = api;
    this._registry = new Registry(api);
    this._signaturereg = new SignatureReg(api, this._registry);
    this._tokenreg = new TokenReg(api, this._registry);
  }

  get registry () {
    return this._registry;
  }

  get signatureReg () {
    return this._signaturereg;
  }

  get tokenReg () {
    return this._tokenreg;
  }

  static create (api) {
    return new Contracts(api);
  }

  static get () {
    return instance;
  }
}
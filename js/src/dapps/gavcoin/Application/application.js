import BigNumber from 'bignumber.js';
import React, { Component, PropTypes } from 'react';

import getMuiTheme from 'material-ui/styles/getMuiTheme';
import lightBaseTheme from 'material-ui/styles/baseThemes/lightBaseTheme';

const muiTheme = getMuiTheme(lightBaseTheme);

import registryAbi from '../abi/registry.json';
import gavcoinAbi from '../abi/gavcoin.json';

import Accounts from '../Accounts';
import Actions, { ActionBuyIn, ActionRefund, ActionTransfer } from '../Actions';
import Events from '../Events';
import Loading from '../Loading';
import Status from '../Status';

const { api } = window.parity;

const DIVISOR = 10 ** 6;

export default class Application extends Component {
  static childContextTypes = {
    api: PropTypes.object,
    contract: PropTypes.object,
    instance: PropTypes.object,
    muiTheme: PropTypes.object
  };

  state = {
    action: null,
    address: null,
    accounts: [],
    blockNumber: new BigNumber(-1),
    ethBalance: new BigNumber(0),
    gavBalance: new BigNumber(0),
    instance: null,
    loading: true,
    price: null,
    remaining: null,
    totalSupply: null
  }

  componentDidMount () {
    this.attachInterface();
  }

  render () {
    const { accounts, address, blockNumber, gavBalance, loading, price, remaining, totalSupply } = this.state;

    if (loading) {
      return (
        <Loading />
      );
    }

    return (
      <div>
        { this.renderModals() }
        <Status
          address={ address }
          blockNumber={ blockNumber }
          gavBalance={ gavBalance }
          price={ price }
          remaining={ remaining }
          totalSupply={ totalSupply }>
          <Accounts
            accounts={ accounts } />
        </Status>
        <Actions
          onAction={ this.onAction } />
        <Events
          accounts={ accounts } />
      </div>
    );
  }

  renderModals () {
    const { action, accounts, price } = this.state;

    switch (action) {
      case 'BuyIn':
        return (
          <ActionBuyIn
            accounts={ accounts }
            price={ price }
            onClose={ this.onActionClose } />
        );
      case 'Refund':
        return (
          <ActionRefund
            accounts={ accounts }
            price={ price }
            onClose={ this.onActionClose } />
        );
      case 'Transfer':
        return (
          <ActionTransfer
            accounts={ accounts }
            onClose={ this.onActionClose } />
        );
      default:
        return null;
    }
  }

  getChildContext () {
    const { contract, instance } = this.state;

    return {
      api,
      contract,
      instance,
      muiTheme
    };
  }

  onAction = (action) => {
    this.setState({
      action
    });
  }

  onActionClose = () => {
    this.setState({
      action: null
    });
  }

  onNewBlockNumber = (blockNumber) => {
    console.log('blockNumber', blockNumber);
    const { instance, accounts } = this.state;

    Promise
      .all([
        instance.totalSupply.call(),
        instance.remaining.call(),
        instance.price.call()
      ])
      .then(([totalSupply, remaining, price]) => {
        this.setState({
          blockNumber,
          totalSupply,
          remaining,
          price
        });

        const gavQueries = accounts.map((account) => instance.balanceOf.call({}, [account.address]));
        const ethQueries = accounts.map((account) => api.eth.getBalance(account.address));

        return Promise.all([
          Promise.all(gavQueries),
          Promise.all(ethQueries)
        ]);
      })
      .then(([gavBalances, ethBalances]) => {
        this.setState({
          ethBalance: ethBalances.reduce((total, balance) => total.add(balance), new BigNumber(0)),
          gavBalance: gavBalances.reduce((total, balance) => total.add(balance), new BigNumber(0)),
          accounts: accounts.map((account, idx) => {
            const ethBalance = ethBalances[idx];
            const gavBalance = gavBalances[idx];

            account.ethBalance = api.format.fromWei(ethBalance).toFormat(3);
            account.gavBalance = gavBalance.div(DIVISOR).toFormat(6);
            account.hasGav = gavBalance.gt(0);

            return account;
          })
        });
      })
      .catch((error) => {
        console.error('onNewBlockNumber', error);
      });
  }

  attachInterface = () => {
    api.ethcore
      .registryAddress()
      .then((registryAddress) => {
        console.log(`the registry was found at ${registryAddress}`);

        const registry = api.newContract(registryAbi, registryAddress).instance;

        return Promise
          .all([
            registry.getAddress.call({}, [api.format.sha3('gavcoin'), 'A']),
            api.personal.listAccounts(),
            api.personal.accountsInfo()
          ]);
      })
      .then(([address, addresses, infos]) => {
        console.log(`gavcoin was found at ${address}`);

        const contract = api.newContract(gavcoinAbi, address);

        this.setState({
          loading: false,
          address,
          contract,
          instance: contract.instance,
          accounts: addresses.map((address) => {
            const info = infos[address];

            return {
              address,
              name: info.name || 'Unnamed',
              uuid: info.uuid
            };
          })
        });

        api.events.subscribe('eth.blockNumber', this.onNewBlockNumber);
      })
      .catch((error) => {
        console.error('attachInterface', error);
      });
  }
}

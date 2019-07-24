App = {
  web3Provider: null,
  contracts: {},
  account: '0x0',
  loading: false,
  tokenPrice: 1000000000000000,
  tokensSold: 0,
  tokensAvailable: 750000,

  init: function() {
    console.log("App initialized...")
    return App.initWeb3();
  },

  initWeb3: function() {
    if (typeof web3 !== 'undefined') {
      // If a web3 instance is already provided by Meta Mask.
      ethereum.enable();
      App.web3Provider = web3.currentProvider;
      web3 = new Web3(web3.currentProvider);


    } else {
      // Specify default instance if no web3 instance provided
      App.web3Provider = new Web3.providers.HttpProvider('http://localhost:7545');
      web3 = new Web3(App.web3Provider);
    }
    return App.initContracts();
  },

  initContracts: function() {
    $.getJSON("DefaTokenSale.json", function(DefaTokenSale) {
      App.contracts.DefaTokenSale = TruffleContract(DefaTokenSale);
      App.contracts.DefaTokenSale.setProvider(App.web3Provider);
      App.contracts.DefaTokenSale.deployed().then(function(DefaTokenSale) {
        console.log("Defa Token Sale Address:", DefaTokenSale.address);
      });
    }).done(function() {
      $.getJSON("DefaToken.json", function(DefaToken) {
        App.contracts.DefaToken = TruffleContract(DefaToken);
        App.contracts.DefaToken.setProvider(App.web3Provider);
        App.contracts.DefaToken.deployed().then(function(DefaToken) {
          console.log("Defa Token Address:", DefaToken.address);
        });

        App.listenForEvents();
        return App.render();
      });
    })
  },

  // Listen for events emitted from the contract
  listenForEvents: function() {
    App.contracts.DefaTokenSale.deployed().then(function(instance) {
      instance.Sell({}, {
        fromBlock: 0,
        toBlock: 'latest',
      }).then(function(event) {
        console.log("event triggered", event);
        App.render();
      });
    })
  },

  render: function() {
    if (App.loading) {
      return;
    }
    App.loading = true;

    var loader  = $('#loader');
    var content = $('#content');

    loader.show();
    content.hide();

    // Load account data
    web3.eth.getCoinbase(function(err, account) {
      if(err === null) {
        App.account = account;
        $('#accountAddress').html("Your Account: " + account);
      }else{
        console.error(err);
      }
    });

    // Load token sale contract
    App.contracts.DefaTokenSale.deployed().then(function(instance) {
      DefaTokenSaleInstance = instance;
      return DefaTokenSaleInstance.tokenPrice();
    }).then(function(tokenPrice) {
      App.tokenPrice = tokenPrice;
      $('.token-price').html(web3.utils.fromWei(App.tokenPrice, "ether"));
      return DefaTokenSaleInstance.tokensSold();
    }).then(function(tokensSold) {
      App.tokensSold = tokensSold.toNumber();
      $('.coins-sold').html(App.tokensSold);
      console.log(App.tokensSold);
      $('.coins-available').html(App.tokensAvailable);
      console.log(App.tokensAvailable);
      var progressPercent = (Math.ceil(App.tokensSold) / App.tokensAvailable) * 100;
      $('#progress').css('width', progressPercent + '%');

      // Load token contract
      App.contracts.DefaToken.deployed().then(function(instance) {
        DefaTokenInstance = instance;
        console.log(App.account);
        return DefaTokenInstance.balanceOf(App.account);
      }).then(function(balance) {
        $('.defa-balance').html(balance.toNumber());
        App.loading = false;
        loader.hide();
        content.show();
      })
    });
  },

  buyTokens: function() {
    $('#content').hide();
    $('#loader').show();
    var numberOfTokens = parseInt($('#numberOfCoins').val());
    App.contracts.DefaTokenSale.deployed().then(function(instance) {
      return instance.buyTokens(numberOfTokens, {
        from: App.account,
        value: numberOfTokens * App.tokenPrice,
        gas: 500000 // Gas limit
      });
    }).then(function(result) {
      console.log("Tokens bought...")
      $('form').trigger('reset') // reset number of tokens in form
      // Wait for Sell event
    });
  }
}

$(function() {
  $(window).load(function() {
    App.init();
  })
});

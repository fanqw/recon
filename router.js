import React from 'react';
import { BrowserRouter, Route, Switch } from 'react-router-dom';
import Login from './components/Login';
import Category from './components/Category';
import Unit from './components/Unit';
import Order from './components/Order';
import Commodity from './components/Commodity';
import OrderCommodity from './components/OrderCommodity';
import NotFound from './components/NotFound';

const Router = () => {
  return (
    <BrowserRouter>
      <Switch>
        <Route path="/login" component={Login} />
        <Route exact path="/" component={Category} />
        <Route path="/unit" component={Unit} />
        <Route path="/order" component={Order} />
        <Route path="/commodity" component={Commodity} />
        <Route path="/order-commodity" component={OrderCommodity} />
        <Route path="*" component={NotFound} />
      </Switch>
    </BrowserRouter>
  );
};

export default Router;

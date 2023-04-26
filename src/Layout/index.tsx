import React from 'react';
import { Layout as MainLayout } from 'antd';
// import Routes from './routes';

const { Header, Footer, Content } = MainLayout;

const Layout: React.FC = () => {
  return (
    <MainLayout>
      <Header>Header</Header>
      <Content>
        123
        {/* <Routes /> */}
      </Content>
      <Footer>Footer</Footer>
    </MainLayout>
  );
};

export default Layout;

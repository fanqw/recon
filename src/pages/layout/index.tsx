import {
  BankOutlined,
  DashboardOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  ProfileOutlined,
} from '@ant-design/icons'
import type { MenuProps } from 'antd'
import { Avatar, Button, Layout, Menu, theme } from 'antd'
import React, { useEffect, useState } from 'react'
import { Outlet, matchRoutes, useLocation, useNavigate } from 'react-router-dom'
import routers from '../../router'
import './index.scss'
// import logo from '../../asset/images/logo'
// import logo from '../../asset/images/logo.svg'

type MenuItem = Required<MenuProps>['items'][number]
function getItem(
  label: React.ReactNode,
  key: React.Key,
  icon?: React.ReactNode,
  children?: MenuItem[],
  type?: 'group'
): MenuItem {
  return {
    key,
    icon,
    children,
    label,
    type,
  } as MenuItem
}

const items: MenuProps['items'] = [
  getItem('仪表台', '/dashboard', <DashboardOutlined />),
  getItem('物料管理', '/basic', <BankOutlined />, [
    getItem('商品分类', '/basic/category'),
    getItem('商品单位', '/basic/unit'),
    getItem('商品信息', '/basic/commodity'),
  ]),
  getItem('订单管理', '/order', <ProfileOutlined />, [
    getItem('订单商品', '/order/commodity'),
    getItem('订单列表', '/order/list'),
  ]),
]

const { Header, Footer, Content, Sider } = Layout

const Main: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)
  const [selectedKeys, setSelectedKeys] = useState<string[]>([])
  const [openKeys, setOpenKeys] = useState<string[]>([])

  useEffect(() => {
    const routes = matchRoutes(routers, location.pathname) // 返回匹配到的路由数组对象，每一个对象都是一个路由对象
    const pathArr: string[] = []
    if (routes !== null) {
      routes.forEach((item) => {
        const path = item.route.path
        if (path && path !== '/') {
          pathArr.push(path)
        }
      })
    }
    setSelectedKeys(pathArr)
    setOpenKeys(pathArr)
  }, [location.pathname])

  const onClick: MenuProps['onClick'] = (e) => {
    console.log('click ', e)
    navigate(e.key, { replace: true })
  }

  const onOpenChange: MenuProps['onOpenChange'] = (openKeys: string[]) => {
    setOpenKeys(openKeys)
  }
  const {
    token: { colorBgContainer },
  } = theme.useToken()

  console.log('selectedKeys', selectedKeys)
  console.log('openKeys', openKeys)

  return (
    <Layout className="layout">
      <Sider width={180} trigger={null} collapsible collapsed={collapsed}>
        <div className="logo">
          <img src={require('../../asset/images/logo.svg')} />
          {!collapsed && <div className="title">对账系统</div>}
        </div>
        <Menu
          theme="dark"
          selectedKeys={selectedKeys}
          openKeys={openKeys}
          onClick={onClick}
          onOpenChange={onOpenChange}
          mode="inline"
          inlineCollapsed={collapsed}
          items={items}
        />
      </Sider>
      <Layout>
        <Header
          className="header"
          style={{ padding: 0, background: colorBgContainer }}
        >
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{
              fontSize: '16px',
              width: 64,
              height: 64,
            }}
          />
          <div className="header-avatar">
            <Avatar
              style={{
                backgroundColor: '#fde3cf',
                color: '#f56a00',
                marginRight: '12px',
              }}
            >
              A
            </Avatar>
            <span>admin</span>
          </div>
        </Header>
        <Content
          style={{
            padding: 24,
            margin: 0,
            minHeight: 'calc(100vh - 64px)',
          }}
        >
          {/* <Breadcrumb>
            <Breadcrumb.Item>Home</Breadcrumb.Item>
            <Breadcrumb.Item>List</Breadcrumb.Item>
            <Breadcrumb.Item>App</Breadcrumb.Item>
          </Breadcrumb> */}
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}

export default Main

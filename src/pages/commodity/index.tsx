import { Button, Card, Form, Input, Modal, Space, Table } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import React, { useState } from 'react'
import './index.scss'

const { Search } = Input

interface DataType {
  key: string
  name: string
  desc: string
  create_at: Date
  update_at: Date
}

const data: DataType[] = [
  {
    key: '1',
    name: '香蕉',
    desc: '计件',
    update_at: new Date(),
    create_at: new Date(),
  },
  {
    key: '2',
    name: '火龙果',
    desc: '计件',
    update_at: new Date(),
    create_at: new Date(),
  },
  {
    key: '3',
    name: '油桃',
    desc: '斤',
    update_at: new Date(),
    create_at: new Date(),
  },
]

const Commodity: React.FC = () => {
  const [open, setOpen] = useState(false)
  const onFinish = (values: any) => {
    console.log('Success:', values)
  }

  const onFinishFailed = (errorInfo: any) => {
    console.log('Failed:', errorInfo)
  }

  const columns: ColumnsType<DataType> = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      render: (text) => <a>{text}</a>,
    },
    {
      title: '说明',
      dataIndex: 'desc',
      key: 'desc',
    },
    {
      title: '更新时间',
      dataIndex: 'update_at',
      key: 'update_at',
      render: (value) =>
        value ? dayjs(value).format('YYYY-MM-DD HH:MM:ss') : '--',
    },
    {
      title: '创建时间',
      dataIndex: 'create_at',
      key: 'create_at',
      render: (value) =>
        value ? dayjs(value).format('YYYY-MM-DD HH:MM:ss') : '--',
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          <a onClick={() => setOpen(true)}>编辑</a>
          <a>删除</a>
        </Space>
      ),
    },
  ]
  return (
    <>
      <Card title="商品信息">
        <div className="commodity-header">
          <Button type="primary" onClick={() => setOpen(true)}>
            新增
          </Button>
          <Search
            placeholder="请输入名称、说明搜索"
            allowClear
            enterButton="搜索"
            size="middle"
            className="commodity-search"
            // onSearch={onSearch}
          />
        </div>
        <Table columns={columns} dataSource={data} />
      </Card>
      <Modal
        title="新增商品"
        open={open}
        footer={false}
        onCancel={() => setOpen(false)}
      >
        <Form
          name="basic"
          labelCol={{ span: 4 }}
          wrapperCol={{ span: 18 }}
          style={{ maxWidth: 600 }}
          initialValues={{ remember: true }}
          onFinish={onFinish}
          onFinishFailed={onFinishFailed}
          autoComplete="off"
        >
          <Form.Item
            label="商品名称"
            name="name"
            rules={[{ required: true, message: '请输入品种名称!' }]}
          >
            <Input placeholder="请输入品种名称" />
          </Form.Item>

          <Form.Item label="品种说明" name="desc">
            <Input.TextArea placeholder="请输入品种说明" rows={5} />
          </Form.Item>

          <Form.Item wrapperCol={{ offset: 10, span: 14 }}>
            <Button type="primary" htmlType="submit">
              保存
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}

export default Commodity

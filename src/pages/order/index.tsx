import orderService from '@services/order.service'
import { Button, Card, Form, Input, Modal, Space, Table, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import './index.scss'

const { Search } = Input

export interface DataType {
  id: string
  name: string
  desc: string
  create_at: Date
  update_at: Date
}

const Order: React.FC = () => {
  const [list, setList] = useState([])
  const [modalData, setModalData] = useState({
    name: '',
    desc: '',
  })
  const [orderId, setOrderId] = useState('')
  const [open, setOpen] = useState(false)
  const [listLoading, setListLoading] = useState(true)
  const [loading, setLoading] = useState(false)
  const [removeLoading, setRemoveLoading] = useState(false)
  useEffect(() => {
    handleOrderList()
  }, [])

  const handleOrderList = async () => {
    setListLoading(true)
    const res = await orderService.getOrderList()
    setListLoading(false)
    if (res.code === 200) {
      setList(res.data)
    } else {
      setList([])
    }
  }

  const handleOpenModal = (data: any) => {
    setModalData(data)
    setOpen(true)
  }

  const handleCloseModal = (refresh: boolean) => {
    setModalData({
      name: '',
      desc: '',
    })
    setOrderId('')
    setOpen(false)
    if (refresh) {
      handleOrderList()
    }
  }

  const handleCreateOrder = async (values: any) => {
    const res = await orderService.createOrder(values)
    setLoading(false)
    if (res?.code === 200) {
      message.success('创建成功')
      handleCloseModal(true)
      return
    }
    message.error('创建失败，请重试')
  }

  const handleUpdateOrder = async (id: string, values: any) => {
    const res = await orderService.editOrder(id, values)
    setLoading(false)
    if (res?.code === 200) {
      message.success('修改成功')
      handleCloseModal(true)
      return
    }
    message.error('修改失败，请重试')
  }

  const handleRemove = async (id: string) => {
    setOrderId(id)
    setRemoveLoading(true)
    const res = await orderService.removeOrder(id)
    setRemoveLoading(false)
    if (res?.code === 200) {
      message.success('删除成功')
      handleOrderList()
    } else {
      message.error(`删除失败，失败原因：${res.message}`)
    }
  }

  const onFinish = async (values: any) => {
    setLoading(true)
    if (orderId) {
      handleUpdateOrder(orderId, values)
    } else {
      handleCreateOrder(values)
    }
  }

  const onFinishFailed = (errorInfo: any) => {
    console.log('Failed:', errorInfo)
  }

  const columns: ColumnsType<DataType> = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => <span>{text}</span>,
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
      render: (_, record) => {
        const loading = removeLoading && record.id === orderId
        return (
          <Space size="middle">
            <Link to={`/order/detail/${record.id}`}>详情</Link>
            <a
              onClick={() => {
                setOrderId(record.id)
                handleOpenModal({ name: record.name, desc: record.desc })
              }}
            >
              编辑
            </a>
            {loading ? (
              <span style={{ color: '#999' }}>删除</span>
            ) : (
              <a onClick={() => handleRemove(record.id)}>删除</a>
            )}
          </Space>
        )
      },
    },
  ]
  return (
    <>
      <Card title="订单列表">
        <div className="order-header">
          <Button
            type="primary"
            onClick={() => {
              setOrderId('')
              handleOpenModal({
                name: dayjs().format('YYYYMMDDHHMMss'),
                desc: '',
              })
            }}
          >
            新增
          </Button>
          <Search
            placeholder="请输入名称、说明搜索"
            allowClear
            enterButton="搜索"
            size="middle"
            className="order-search"
            // onSearch={onSearch}
          />
        </div>
        <Table
          rowKey="id"
          loading={listLoading}
          columns={columns}
          dataSource={list}
        />
      </Card>
      <Modal
        title={`${orderId ? '编辑' : '新增'}订单`}
        open={open}
        footer={false}
        onCancel={() => setOpen(false)}
        destroyOnClose
      >
        <Form
          name="basic"
          labelCol={{ span: 4 }}
          wrapperCol={{ span: 18 }}
          style={{ maxWidth: 600 }}
          initialValues={modalData}
          onFinish={onFinish}
          onFinishFailed={onFinishFailed}
          autoComplete="off"
        >
          <Form.Item
            label="订单名称"
            name="name"
            rules={[{ required: true, message: '请输入订单名称!' }]}
          >
            <Input placeholder="请输入订单名称" />
          </Form.Item>

          <Form.Item label="订单说明" name="desc">
            <Input.TextArea placeholder="请输入订单说明" rows={5} />
          </Form.Item>

          <Form.Item wrapperCol={{ offset: 10, span: 14 }}>
            <Button type="primary" htmlType="submit" loading={loading}>
              保存
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}

export default Order

import orderService, { Params } from '@services/order.service'
import { Button, Card, Form, Input, Modal, Space, Table, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import './index.scss'

export interface DataType {
  id: string
  name: string
  desc: string
  create_at: Date
  update_at: Date
}

const Order: React.FC = () => {
  const [list, setList] = useState([])
  const [current, setCurrent] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [total, setTotal] = useState(0)
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
    handleOrderList({
      current,
      pageSize,
    })
  }, [])

  const handleOrderList = async (params: Params) => {
    setListLoading(true)
    const res = await orderService.getOrderList(params)
    setListLoading(false)
    if (res.code === 200) {
      setList(res.data.rows)
      setTotal(res.data.total)
    } else {
      setList([])
      setTotal(0)
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
      handleOrderList({
        current,
        pageSize,
      })
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
      handleOrderList({
        current,
        pageSize,
      })
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

  const onPageChange = (page: number, _pageSize: number) => {
    setCurrent(page)
    handleOrderList({
      current: page,
      pageSize,
    })
  }

  const onShowSizeChange = (_page: number, pageSize: number) => {
    setPageSize(pageSize)
  }

  const columns: ColumnsType<DataType> = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Link to={`/order/list/${record.id}`}>{text}</Link>
      ),
    },
    {
      title: '备注',
      dataIndex: 'desc',
      key: 'desc',
      ellipsis: true,
      width: 400,
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
          <div style={{ height: 24, lineHeight: 1.5 }}>共 {total} 项</div>
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
        </div>
        <Table
          rowKey="id"
          loading={listLoading}
          columns={columns}
          dataSource={list}
          pagination={{
            current,
            pageSize,
            total,
            onChange: onPageChange,
            onShowSizeChange,
          }}
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

          <Form.Item label="订单备注" name="desc">
            <Input.TextArea placeholder="请输入订单备注" rows={5} />
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

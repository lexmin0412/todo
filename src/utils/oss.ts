import { DataItem } from "../types";
import OSS from "ali-oss";
import { Snackbar } from "@varlet/ui";

export interface OssClientInitProps {
	/**
	 * STS 方式需要这个参数，即阿里云 SDK 返回的 SecurityToken 字段
	 */
	securityToken?: string
	region: string;
	accessKeyId: string;
	accessKeySecret: string;
	bucket: string;
}

class OssClient {
	constructor(props: OssClientInitProps) {
		const store = new OSS({
			stsToken: props.securityToken,
			region: props.region,
			accessKeyId: props.accessKeyId,
			accessKeySecret: props.accessKeySecret,
			bucket: props.bucket,
		});
		this.store = store;
	}

	store: OSS;

	getList() {
		return this.store.get('apis/todo/data.json', undefined, {
			headers: {
				'Content-type': 'application/json'
			}
		})
	}

	/**
	 * 获取用户列表
	 */
	getUsers() {
		return this.store.get('apis/common/users.json', undefined, {
			headers: {
				'Content-type': 'application/json'
			}
		}).catch(err => {
			if (err.code === 'InvalidAccessKeyId') {
				Snackbar({
					content: "accessKeyId 错误",
					type: "error",
				})
			}
			return Promise.reject(err)
		})
	}

	async add(newItem: DataItem) {
		const res = await this.getList()
		const list = JSON.parse(res.content.toString()).list
		const newList = [
			...list,
			newItem
		]
		// eslint-disable-next-line @typescript-eslint/ban-ts-comment
		// @ts-ignore
		return this.store.put(`/apis/todo/data.json`, new OSS.Buffer(JSON.stringify({
			list: newList
		}, null, 2)))
	}

	async update(id: string, newValues: Omit<DataItem, 'id'>) {
		const res = await this.getList()
		const list = JSON.parse(res.content.toString()).list
		const newList = list.map((item: DataItem) => {
			if (item.id === id) {
				return {
					...item,
					...newValues
				}
			}
			return item
		})
		// eslint-disable-next-line @typescript-eslint/ban-ts-comment
		// @ts-ignore
		return this.store.put(`/apis/todo/data.json`, new OSS.Buffer(JSON.stringify({
			list: newList
		}, null, 2)))
	}

	async delete(id: string) {
		const res = await this.getList()
		const list = JSON.parse(res.content.toString()).list

		const newList = list.filter((item: DataItem) => item.id !== id)
		// eslint-disable-next-line @typescript-eslint/ban-ts-comment
		// @ts-ignore
		return this.store.put(`/apis/todo/data.json`, new OSS.Buffer(JSON.stringify({
			list: newList
		}, null, 2)))
	}

	/**
	 * 查询详情
	 * @param id todo id
	 */
	async getDetail(id: string) {
		const res = await this.getList()
		const events = JSON.parse(res.content.toString()).list

		const detail = events.find((item: DataItem) => item.id === id)
		return detail
	}
}

export default OssClient;


export type UserCode = 'viola' | 'lexmin'

export interface UserItem {
	code: UserCode
	name: string
	avatar: string
}

export interface DataItem {
	id: string
	content: string
	done: boolean
	type: 'work' | 'study' | 'life'
	/**
	 * 创建时间
	 */
	createdTime: string
	/**
	 * 最后更新时间
	 */
	lastUpdatedTime: string
	/**
	 * 指定用户
	 */
	users: UserCode[]
	/**
	 * 开始时间
	 */
	startTime: string
	/**
	 * 结束时间
	 */
	endTime: string
}

/**
 * 扩展了 userItems 属性的事项列表
 */
export type ListWithUserItems = Array<DataItem & {
	userItems: UserItem[]
}>

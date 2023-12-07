export interface DataItem {
	id: string
	content: string
	done: boolean
	type: 'work' | 'life'
	/**
	 * 创建时间
	 */
	createdTime: string
	/**
	 * 最后更新时间
	 */
	lastUpdatedTime: string
}

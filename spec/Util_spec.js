const Util = require('../lib/Util')

describe('Init', () => {
  describe('tableToSelect', () => {
    it('should return correct output', () => {
      const data = [
        { id: 1, name: 'one', order: 4 },
        { id: 2, name: 'two', order: 3 },
        { id: 3, name: 'three', order: 2 },
        { id: 4, name: 'four', order: 1 }
      ]

      expect(Util.tableToSelect(data, 'id', 'name', 'id')).toEqual(
        [
          { id: 1, name: 'one' },
          { id: 2, name: 'two' },
          { id: 3, name: 'three' },
          { id: 4, name: 'four' }
        ]
      )
    })

    it('should map fields correctly', () => {
      const data = [
        { identifier: 1, data: 'one', order: 4 },
        { identifier: 2, data: 'two', order: 3 },
        { identifier: 3, data: 'three', order: 2 },
        { identifier: 4, data: 'four', order: 1 }
      ]

      expect(Util.tableToSelect(data, 'identifier', 'data')).toEqual(
        [
          { id: 1, name: 'one' },
          { id: 2, name: 'two' },
          { id: 3, name: 'three' },
          { id: 4, name: 'four' }
        ]
      )
    })

    it('should sort correctly', () => {
      const data = [
        { id: 1, name: 'one', order: 4 },
        { id: 2, name: 'two', order: 3 },
        { id: 3, name: 'three', order: 2 },
        { id: 4, name: 'four', order: 1 }
      ]

      expect(Util.tableToSelect(data, 'id', 'name', 'order')).toEqual(
        [
          { id: 4, name: 'four' },
          { id: 3, name: 'three' },
          { id: 2, name: 'two' },
          { id: 1, name: 'one' }
        ]
      )
    })
  })

  describe('filter', () => {
    it('should return correct output', () => {
      const data = [
        { id: 1, name: 'one', order: 4 },
        { id: 2, name: 'two', order: 3 },
        { id: 3, name: 'three', order: 2 },
        { id: 4, name: 'four', order: 1 }
      ]

      expect(Util.filter(data, { id: 2 })).toEqual(
        [
          { id: 2, name: 'two', order: 3 }
        ]
      )
    })
  })

  describe('tableToObject', () => {
    it('should return correct output', () => {
      const data = [
        { id: 1, name: 'one', order: 4 },
        { id: 2, name: 'two', order: 3 },
        { id: 3, name: 'three', order: 2 },
        { id: 4, name: 'four', order: 1 }
      ]

      expect(Util.tableToObject(data, 'id')).toEqual(
        {
          1: { id: 1, name: 'one', order: 4 },
          2: { id: 2, name: 'two', order: 3 },
          3: { id: 3, name: 'three', order: 2 },
          4: { id: 4, name: 'four', order: 1 }
        }
      )
    })

    it('should map fields correctly correct output', () => {
      const data = [
        { id: 1, name: 'one', order: 4 },
        { id: 2, name: 'two', order: 3 },
        { id: 3, name: 'three', order: 2 },
        { id: 4, name: 'four', order: 1 }
      ]

      expect(Util.tableToObject(data, 'name')).toEqual(
        {
          one: { id: 1, name: 'one', order: 4 },
          two: { id: 2, name: 'two', order: 3 },
          three: { id: 3, name: 'three', order: 2 },
          four: { id: 4, name: 'four', order: 1 }
        }
      )
    })
  })

  describe('objectToSortedArray', () => {
    it('should return correct output', () => {
      const data = {
        one: { id: 1, name: 'one', order: 4 },
        two: { id: 2, name: 'two', order: 3 },
        three: { id: 3, name: 'three', order: 2 },
        four: { id: 4, name: 'four', order: 1 }
      }

      expect(Util.objectToSortedArray(data, 'name', false)).toEqual([
        { id: 4, name: 'four', order: 1 },
        { id: 1, name: 'one', order: 4 },
        { id: 3, name: 'three', order: 2 },
        { id: 2, name: 'two', order: 3 }
      ])
    })

    it('should sort descending', () => {
      const data = {
        one: { id: 1, name: 'one', order: 4 },
        two: { id: 2, name: 'two', order: 3 },
        three: { id: 3, name: 'three', order: 2 },
        four: { id: 4, name: 'four', order: 1 }
      }

      expect(Util.objectToSortedArray(data, 'name', true)).toEqual([
        { id: 2, name: 'two', order: 3 },
        { id: 3, name: 'three', order: 2 },
        { id: 1, name: 'one', order: 4 },
        { id: 4, name: 'four', order: 1 }
      ])
    })

    it('should sort by correct field descending', () => {
      const data = {
        one: { id: 1, name: 'one', order: 4 },
        two: { id: 2, name: 'two', order: 3 },
        three: { id: 3, name: 'three', order: 2 },
        four: { id: 4, name: 'four', order: 1 }
      }

      expect(Util.objectToSortedArray(data, 'id', true)).toEqual([
        { id: 4, name: 'four', order: 1 },
        { id: 3, name: 'three', order: 2 },
        { id: 2, name: 'two', order: 3 },
        { id: 1, name: 'one', order: 4 }
      ])
    })
  })
})

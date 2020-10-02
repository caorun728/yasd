/** @jsx jsx */
import { jsx } from '@emotion/core'
import styled from '@emotion/styled/macro'
import css from '@emotion/css/macro'
import bytes from 'bytes'
import useSWR from 'swr'
import tw from 'twin.macro'
import React, { useMemo } from 'react'

import { ConnectorTraffic, Traffic } from '../../../types'
import fetcher from '../../../utils/fetcher'

const Cell = styled.div`
  ${tw`px-4 py-3`}
`

const Title = styled.div`
  ${tw`text-sm text-gray-500 leading-relaxed font-medium`}
`

const Data = styled.div`
  ${tw`text-lg text-gray-700 leading-normal`}
`

const TrafficCell: React.FC = () => {
  const { data: traffic, error: trafficError } = useSWR<Traffic>(
    '/traffic',
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      refreshInterval: 2000,
    },
  )

  const activeConnector = useMemo(() => {
    if (!traffic) return undefined

    const aggregation: ConnectorTraffic = {
      outCurrentSpeed: 0,
      in: 0,
      inCurrentSpeed: 0,
      outMaxSpeed: 0,
      out: 0,
      inMaxSpeed: 0,
    }

    // 第一个
    for (const name in traffic.connector) {
      const conn = traffic.connector[name]

      aggregation.in += conn.in
      aggregation.out += conn.out
      aggregation.outCurrentSpeed += conn.outCurrentSpeed
      aggregation.inCurrentSpeed += conn.inCurrentSpeed
    }

    return aggregation
  }, [traffic])

  return (
    <div tw="grid grid-cols-3 gap-4 divide-x divide-gray-200 border-solid border border-gray-200 bg-gray-100">
      {activeConnector && (
        <React.Fragment>
          <Cell>
            <Title>Upload</Title>
            <Data>{bytes(activeConnector.outCurrentSpeed)}/s</Data>
          </Cell>
          <Cell>
            <Title>Download</Title>
            <Data>{bytes(activeConnector.inCurrentSpeed)}/s</Data>
          </Cell>
          <Cell>
            <Title>Total</Title>
            <Data>{bytes(activeConnector.in + activeConnector.out)}</Data>
          </Cell>
        </React.Fragment>
      )}
    </div>
  )
}

export default TrafficCell

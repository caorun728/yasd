/** @jsx jsx */
import { jsx } from '@emotion/core'
import axios from 'axios'
import React, {
  FormEventHandler,
  useCallback,
  useEffect,
  useState,
} from 'react'
import { Heading, Input, LoadingButton, Checkbox } from '@sumup/circuit-ui'
import { CircleWarning } from '@sumup/icons'
import css from '@emotion/css/macro'
import tw from 'twin.macro'
import store from 'store2'
import { v4 as uuid } from 'uuid'
import { find } from 'lodash-es'
import { useHistory } from 'react-router-dom'

import ProfileCell from '../../components/ProfileCell'
import Ad from '../../components/Ad'
import useSetState from '../../hooks/use-set-state'
import { Profile } from '../../types'
import { ExistingProfiles, LastUsedProfile } from '../../utils/constant'

const Page: React.FC = () => {
  const history = useHistory()
  const protocol = window.location.protocol
  const [name, setName] = useState('')
  const [host, setHost] = useState('')
  const [port, setPort] = useState('')
  const [key, setKey] = useState('')
  const [useTls, setUseTls] = useState<boolean>(() => protocol === 'https:')
  const [existingProfiles, setExistingProfiles, getExistingProfiles] =
    useSetState<Array<Profile>>([])
  const [hasError, setHasError] = useState<boolean | string>(false)
  const [isLoading, setIsLoading] = useState<boolean>(false)

  const addProfile = (config: Omit<Profile, 'id'>): Profile => {
    const profile: Profile = {
      ...config,
      id: uuid(),
    }
    const newProfiles = [profile, ...existingProfiles]
    setExistingProfiles(newProfiles)
    store.set(ExistingProfiles, newProfiles)
    store.set(LastUsedProfile, profile.id)

    return profile
  }

  const selectProfile = useCallback(
    (id: string) => {
      getExistingProfiles().then((profiles) => {
        const profile = find(profiles, { id })

        if (profile) {
          store.set(LastUsedProfile, profile.id)
          history.replace('/home')
        }
      })
    },
    [getExistingProfiles, history],
  )

  const deleteProfile = useCallback(
    (id: string) => {
      const profiles = existingProfiles.filter((item) => item.id !== id)

      setExistingProfiles(profiles)
      store.set(ExistingProfiles, profiles)
    },
    [setExistingProfiles, existingProfiles],
  )

  const resetFields = () => {
    setName('')
    setHost('')
    setPort('')
    setKey('')
    setUseTls(protocol === 'https:')
  }

  const onSubmit: FormEventHandler = (e) => {
    e.preventDefault()

    if (!name || !host || !port || !key) {
      return
    }

    setIsLoading(true)

    axios
      .request({
        url: `${useTls ? 'https' : 'http'}://${host}:${port}/v1/outbound`,
        method: 'GET',
        timeout: 3000,
        headers: {
          'x-key': key,
        },
      })
      .then((res) => {
        setHasError(false)

        const newProfile = addProfile({
          name,
          host,
          port: Number(port),
          key,
          platform: res.headers['x-system']?.includes('macOS')
            ? 'macos'
            : 'ios',
          platformVersion: res.headers['x-surge-version'] || '',
          platformBuild: res.headers['x-surge-build'] || '',
          tls: useTls,
        })

        resetFields()
        setIsLoading(false)
        selectProfile(newProfile.id)
      })
      .catch((err) => {
        setHasError(err.message)
        console.error(err)
        setIsLoading(false)
      })
  }

  useEffect(() => {
    const storedExistingProfiles = store.get(ExistingProfiles)

    if (storedExistingProfiles) {
      setExistingProfiles(storedExistingProfiles)
    }
  }, [setExistingProfiles])

  return (
    <div
      css={css`
        padding-bottom: calc(env(safe-area-inset-bottom) + 1.25rem);
      `}>
      <Heading
        size={'tera'}
        noMargin
        tw="sticky top-0 flex shadow bg-white z-10 px-3 py-3 mb-4">
        YASD
        <small tw="text-xs font-normal font-mono text-gray-600 ml-3">
          {`v${process.env.REACT_APP_VERSION}`}
        </small>
      </Heading>

      <div tw="max-w-xs sm:max-w-sm md:max-w-md mx-auto">
        <Heading size={'tera'}>Add New Host</Heading>

        <div tw="bg-teal-100 border-t-4 border-teal-500 rounded-b text-teal-900 text-sm px-4 py-3 mb-4 shadow-md">
          <p tw="leading-normal mb-2">
            该功能仅 Surge iOS 4.4.0 和 Surge Mac 4.0.0 以上版本支持。
          </p>
          <p tw="leading-normal mb-4">
            <a
              href="https://manual.nssurge.com/others/http-api.html#configuration"
              target="_blank"
              rel="noreferrer"
              tw="border-b border-solid border-teal-500">
              🔗 开启方式
            </a>
          </p>
          <p tw="leading-normal mb-2">
            Surge Mac v4.0.6 (1280) 开始已支持开启 HTTPS API，故不再支持使用
            yasd-helper。
          </p>
        </div>

        <form onSubmit={onSubmit}>
          <Input
            type="text"
            required
            invalid={!!hasError}
            label="Name"
            placeholder="Mac"
            value={name}
            onChange={({ target }) =>
              setName((target as HTMLInputElement).value)
            }
          />
          <Input
            type="text"
            required
            invalid={!!hasError}
            label="Host"
            placeholder="127.0.0.1"
            validationHint="局域网内可用类似 iphone.local 的地址"
            value={host}
            onChange={({ target }) =>
              setHost((target as HTMLInputElement).value)
            }
          />
          <Input
            type="number"
            required
            invalid={!!hasError}
            label="Port"
            placeholder="6171"
            value={port}
            onChange={({ target }) =>
              setPort((target as HTMLInputElement).value)
            }
          />
          <Input
            type="text"
            required
            invalid={!!hasError}
            label="Key"
            placeholder="examplekey"
            value={key}
            onChange={({ target }) =>
              setKey((target as HTMLInputElement).value)
            }
          />

          <div>
            <Checkbox
              disabled={protocol === 'https:'}
              checked={useTls}
              onChange={() => setUseTls((prev) => !prev)}>
              HTTPS（请确保开启 <code>http-api-tls</code>）
            </Checkbox>
          </div>

          <div tw="mt-6">
            <LoadingButton
              type="submit"
              variant="primary"
              stretch
              isLoading={isLoading}
              loadingLabel={'Loading'}>
              Done
            </LoadingButton>
          </div>

          {typeof hasError === 'string' && (
            <div tw="text-red-400 mt-4 flex items-center">
              <CircleWarning tw="mr-2" />
              {hasError}
            </div>
          )}
        </form>
      </div>

      {existingProfiles.length > 0 && (
        <div tw="max-w-xs sm:max-w-sm md:max-w-md mx-auto mt-10">
          <Heading size={'mega'}>History</Heading>

          <div tw="bg-gray-100 divide-y divide-gray-200 rounded overflow-hidden">
            {existingProfiles.map((profile) => {
              return (
                <div key={profile.id} tw="hover:bg-gray-200">
                  <ProfileCell
                    profile={profile}
                    variant="left"
                    checkConnectivity
                    showDelete
                    onClick={() => selectProfile(profile.id)}
                    onDelete={() => deleteProfile(profile.id)}
                  />
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div tw="max-w-xs sm:max-w-sm md:max-w-md mx-auto mt-10">
        <Ad />
      </div>
    </div>
  )
}

export default Page

import client from '../apolloClient';
import _isEmpty from 'lodash/isEmpty';
import _get from 'lodash/get';
import _uniqueId from 'lodash/uniqueId';
import _map from 'lodash/map';
import _find from 'lodash/find';
import _filter from 'lodash/filter';
import { setUserInfoInStorage } from '../Utils';
import {
  updateUserFoldersInCache,
  addLinkInCache,
  deleteLinkFromCache,
  getFolderDetailsFromCache,
} from './GraphqlHelpers';
import {
  addFolderMutation,
  updateFolderMutation,
  deleteFolderMutation,
  addLinkMutation,
  updateLinkMutation,
  deleteLinkMutation,
  updateLinksMetadataMutation,
} from './Mutations';

export const DEFAULT_PAGE_SIZE = 9;

export const addFolder =
  ({ name }) =>
  async (dispatch, getState) => {
    const state = getState();
    try {
      dispatch(setLoaderVisibility(true));
      await client.mutate({
        mutation: addFolderMutation,
        variables: {
          input: { name },
        },
        update: (
          _,
          {
            data: {
              folderManagement: { addFolder },
            },
          }
        ) => {
          const { id, name } = addFolder;
          updateUserFoldersInCache({
            addedFolders: [{ id, name }],
            userId: _get(state, 'userDetails.id', ''),
          });
        },
      });
    } catch (e) {
      console.error(e);
      dispatch(
        setToastMessage({
          title: 'Something went wrong',
          status: 'error',
          isClosable: true,
          position: 'bottom-left',
        })
      );
    } finally {
      dispatch(setLoaderVisibility(false));
    }
  };

export const updateFolder = ({ name, id }) => {
  return async (dispatch, getState) => {
    try {
      await client.mutate({
        mutation: updateFolderMutation,
        variables: { input: { id, name } },
        optimisticResponse: {
          folderManagement: {
            updateFolder: { id, name, __typename: 'Folder' },
            __typename: 'FolderMutations',
          },
        },
      });
    } catch (e) {
      console.error(e);
      dispatch(
        setToastMessage({
          title: 'Something went wrong',
          status: 'error',
          isClosable: true,
          position: 'bottom-left',
        })
      );
    }
  };
};

export const deleteFolder = ({ id }) => {
  return async (dispatch, getState) => {
    const state = getState();
    const userId = _get(state, 'userDetails.id', '');
    try {
      await client.mutate({
        mutation: deleteFolderMutation,
        variables: { input: { id } },
        optimisticResponse: {
          folderManagement: {
            deleteFolder: { id, __typename: 'Folder' },
            __typename: 'FolderMutations',
          },
        },
        update: (_, { data }) => {
          const id = _get(data, 'folderManagement.deleteFolder.id', '');
          const removedFolders = [id];
          updateUserFoldersInCache({ removedFolders, userId });
        },
      });
    } catch (e) {
      console.error(e);
      dispatch(
        setToastMessage({
          title: 'Something went wrong',
          status: 'error',
          isClosable: true,
          position: 'bottom-left',
        })
      );
    }
  };
};

export const addLinkBasicDetails = ({ url, isCompleted, folderId }) => {
  return async (dispatch) => {
    try {
      await client.mutate({
        mutation: addLinkMutation,
        variables: { input: { url, folderId, isCompleted } },
        update: (
          _,
          {
            data: {
              linkManagement: { addLink },
            },
          }
        ) => {
          addLinkInCache({
            folderId,
            linkFilters: { isCompleted },
            linkData: addLink,
          });
        },
      });
    } catch (e) {
      console.error(e);
      dispatch(
        setToastMessage({
          title: 'Something went wrong',
          status: 'error',
          isClosable: true,
          position: 'bottom-left',
        })
      );
    }
  };
};

export const updateLinkBasicDetails = ({ linksDetails }) => {
  return async (dispatch) => {
    try {
      await client.mutate({
        mutation: updateLinkMutation,
        variables: {
          input: linksDetails,
        },
        refetchQueries: ['getFolderDetails'],
        awaitRefetchQueries: true,
      });
    } catch (e) {
      console.error(e);
      dispatch(
        setToastMessage({
          title: 'Something went wrong',
          status: 'error',
          isClosable: true,
          position: 'bottom-left',
        })
      );
    }
  };
};

export const updateLinksMetadata = ({ linksDetails }) => {
  return async (dispatch) => {
    try {
      await client.mutate({
        mutation: updateLinksMetadataMutation,
        variables: { input: linksDetails },
      });
    } catch (e) {
      console.error(e);
      dispatch(
        setToastMessage({
          title: 'Something went wrong',
          status: 'error',
          isClosable: true,
          position: 'bottom-left',
        })
      );
    }
  };
};

export const addLink = ({ url, isCompleted, folderId }) => {
  return async (dispatch) => {
    dispatch(setLoaderVisibility(true));
    await dispatch(addLinkBasicDetails({ url, isCompleted, folderId }));
    dispatch(setLoaderVisibility(false));

    const folderDetails = getFolderDetailsFromCache({
      folderId,
      linkFilters: { isCompleted },
    });

    const { links } = folderDetails;
    const { id } = _find(links, ({ url: linkUrl }) => url === linkUrl);
    dispatch(updateLinksMetadata({ linksDetails: [{ url, id }] }));
  };
};

export const updateLink = ({ linksDetails }) => {
  return async (dispatch) => {
    const linksWithNewUrl = _filter(linksDetails, ({ url }) => !!url);

    dispatch(setLoaderVisibility(true));
    await dispatch(updateLinkBasicDetails({ linksDetails }));
    dispatch(setLoaderVisibility(false));

    if (!_isEmpty(linksWithNewUrl)) {
      const updateLinksMetadataPayload = _map(
        linksWithNewUrl,
        ({ id, url }) => ({ id, url })
      );
      dispatch(
        updateLinksMetadata({ linksDetails: updateLinksMetadataPayload })
      );
    }
  };
};

export const deleteLink = ({ isCompleted, folderId, linkIds }) => {
  return async (dispatch, getState) => {
    const mutationInput = _map(linkIds, (id) => ({ id }));
    const responseLinks = _map(linkIds, (id) => ({ id, __typename: 'Link' }));

    try {
      await client.mutate({
        mutation: deleteLinkMutation,
        variables: { input: mutationInput },
        optimisticResponse: {
          linkManagement: {
            deleteLink: responseLinks,
            __typename: 'LinkMutations',
          },
        },
        update: () => {
          deleteLinkFromCache({
            folderId,
            linkFilters: { isCompleted },
            linkIds,
          });
        },
      });
    } catch (e) {
      console.error(e);
      dispatch(
        setToastMessage({
          title: 'Something went wrong',
          status: 'error',
          isClosable: true,
          position: 'bottom-left',
        })
      );
    }
  };
};

const origin = process.env.REACT_APP_SERVER_URL;

const SET_LOADER_VISIBILITY = 'SET_LOADER_VISIBILITY';

const UPDATE_USER_LOGGED_IN_STATUS = 'UPDATE_USER_LOGGED_IN_STATUS';

const SET_USER_DETAILS = 'SET_USER_DETAILS';

const SET_TOAST_MESSAGE = 'SET_TOAST_MESSAGE';

export const setLoaderVisibility = (payload) => {
  return { type: SET_LOADER_VISIBILITY, payload };
};

export const updateUserLoggedInStatus = (payload) => {
  return { type: UPDATE_USER_LOGGED_IN_STATUS, payload };
};

export const setUserDetails = (payload) => {
  return { type: SET_USER_DETAILS, payload };
};

export const setToastMessage = (payload) => {
  return { type: SET_TOAST_MESSAGE, payload };
};

export const loginUser = (data) => {
  return async (dispatch, getState) => {
    let responseData = {};

    let res = {};
    try {
      dispatch(setLoaderVisibility(true));

      res = await fetch(`${origin}/login`, {
        method: 'POST',
        body: JSON.stringify(data),
        headers: {
          'Content-Type': 'application/json',
        },
        referrerPolicy: 'no-referrer',
      });

      responseData = await res.json();

      const { message, ...userInfo } = responseData;
      if (res.ok) {
        setUserInfoInStorage({ userInfo });
        dispatch(setUserDetails(userInfo));

        /**
         * When we redirect using following approach, it will unmount App and
         * remount it. This is necessary because without it App won't be able to
         * use updated localStorage data.
         */
        window.location.href = '/';
      } else {
        dispatch(
          setToastMessage({
            title: message || res.statusText,
            status: 'error',
            isClosable: true,
            position: 'bottom-left',
          })
        );
      }
    } catch (e) {
      dispatch(
        setToastMessage({
          title: 'Something went wrong',
          status: 'error',
          isClosable: true,
          position: 'bottom-left',
        })
      );
    } finally {
      dispatch(setLoaderVisibility(false));
    }
  };
};

export const registerUser = (data, successCallback) => {
  return async (dispatch) => {
    let responseData = {};

    let res = {};

    try {
      dispatch(setLoaderVisibility(true));

      res = await fetch(`${origin}/signup`, {
        method: 'POST',
        body: JSON.stringify(data),
        headers: {
          'Content-Type': 'application/json',
        },
        referrerPolicy: 'no-referrer',
      });

      /**
       * If res status is ok(status is 200) then we will do redirection
       */
      if (res.ok) {
        successCallback && successCallback();
      } else {
        /**
         * Fetch api throws error only when network error occur.
         * For status 4xx and 5xx, we have to add logic for toast in try block
         */
        responseData = await res.json();

        const { message } = responseData;

        /**
         * If there is message from backend then we will use it otherwise we use
         * default failure message from res obj.
         */
        dispatch(
          setToastMessage({
            title: message || res.statusText,
            status: 'error',
            isClosable: true,
            position: 'bottom-left',
          })
        );
      }
    } catch (e) {
      dispatch(
        setToastMessage({
          title: 'Something went wrong',
          status: 'error',
          isClosable: true,
          position: 'bottom-left',
        })
      );
    } finally {
      dispatch(setLoaderVisibility(false));
    }
  };
};

const reducerHandlers = {
  [SET_LOADER_VISIBILITY]: (state, action) => {
    const { payload } = action;
    return { ...state, showLoader: payload };
  },
  [UPDATE_USER_LOGGED_IN_STATUS]: (state, action) => {
    const { payload } = action;
    return { ...state, isUserLoggedIn: payload };
  },
  [SET_USER_DETAILS]: (state, action) => {
    const { payload } = action;
    return { ...state, userDetails: payload };
  },
  [SET_TOAST_MESSAGE]: (state, action) => {
    const { payload } = action;
    return { ...state, toastMessage: payload };
  },
};

const initialState = {
  showLoader: false,
  isUserLoggedIn: false,
  userDetails: {},
  toastMessage: {},
};

const reducer = (state, action) => {
  const type = action.type;
  const stateHandler = reducerHandlers[type];
  return stateHandler?.(state, action) ?? initialState;
};

export default reducer;

/**--external-- */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { connect } from 'react-redux';
import _isEmpty from 'lodash/isEmpty';
import _get from 'lodash/get';
import _includes from 'lodash/includes';
import _map from 'lodash/map';
import { Checkbox } from '@chakra-ui/react';
import _filter from 'lodash/filter';
import _find from 'lodash/find';
import _size from 'lodash/size';
import _pipe from 'lodash/flow';
import _reverse from 'lodash/reverse';

/**--internal-- */
import { withQuery, withPagination } from '#components';
import { deleteLink, updateLink, DEFAULT_PAGE_SIZE } from '#modules/Module';
import {
  compose,
  copyToClipboard,
  scrollToBottom,
  getFieldPresenceStatus,
  combineClasses,
} from '#Utils';
import { getFolderDetailsQuery } from '#modules/Queries';
import { getFolderDetailsFromCache } from '#modules/GraphqlHelpers';
import { ADD_LINK, DELETE_LINK, FETCH_MORE_LINK } from '../FolderUtils';

/**--relative-- */
import classes from './Links.module.scss';
import Link from './Link';
import { getLinkActions, DELETE_LINK_OPERATION } from './LinkUtils';
import EditOrCreateLinkModal from '../EditOrCreateLinkModal';
import Actions from './Actions';
import FolderListModal from './FolderListModal';
import { loaderStyle } from './LinksStyles';

const Links = (props) => {
  const {
    folderDetails,
    folderId,
    deleteLink,
    isCompleted,
    updateLink,
    onPageScroll,
    renderLoader,
    fetchMoreFeed,
    linkOperation,
    setLinkOperation,
  } = props;
  const { linksV2 } = folderDetails;

  const [showEditLinkModal, setShowEditLinkModal] = useState(false);

  const [selectedLinks, setSelectedLinks] = useState([]);

  const [showBulkSelection, setShowBulkSelection] = useState(false);

  const [showFolderList, setShowFolderList] = useState(false);

  const listScrollRef = useRef();

  const linksNodeRefs = useRef([]);

  const previousFolderId = useRef(folderId);

  const updateLinksNodeRefs = (node, index) => {
    linksNodeRefs.current[index] = node;
  };

  const links = _pipe((data) => {
    const edges = _get(data, 'edges', []);
    return _map(edges, ({ node }) => node);
  }, _reverse)(linksV2);

  const totalPresentLinks = _size(links);

  const previousTotalPresentLinksRef = useRef(_size(links));

  useEffect(() => {
    if (previousFolderId.current !== folderId) {
      return;
    }

    if (linkOperation === FETCH_MORE_LINK) {
      const addedLinksCount =
        totalPresentLinks - previousTotalPresentLinksRef.current;

      if (!addedLinksCount) {
        return;
      }

      const totalVerticalDistance =
        linksNodeRefs.current?.[addedLinksCount]?.getBoundingClientRect().top ??
        0;

      listScrollRef.current.scrollTop = totalVerticalDistance - 75 - 75;

      setLinkOperation(null);
    }
  }, [totalPresentLinks, linkOperation, folderId]);

  useEffect(() => {
    listScrollRef.current && scrollToBottom(listScrollRef.current);
  }, [folderId, isCompleted]);

  useEffect(() => {
    previousTotalPresentLinksRef.current = totalPresentLinks;
  }, [totalPresentLinks]);

  useEffect(() => {
    disableBulkSelectionMode();
  }, [folderId]);

  useEffect(() => {
    previousFolderId.current = folderId;
  }, [folderId]);

  const openEditLinkModal = useCallback(({ linkId }) => {
    setShowEditLinkModal(true);
    setSelectedLinks([linkId]);
  }, []);

  const closeEditLinkModal = useCallback(() => {
    setShowEditLinkModal(false);
    setSelectedLinks([]);
  }, []);

  const enableBulkSelectionMode = useCallback(({ linkId }) => {
    setShowBulkSelection(true);
    setSelectedLinks([linkId]);
  }, []);

  const disableBulkSelectionMode = useCallback(() => {
    setShowBulkSelection(false);
    setSelectedLinks([]);
  }, []);

  const closeFolderList = useCallback(() => {
    setShowFolderList(false);
    setSelectedLinks([]);
    disableBulkSelectionMode();
  }, []);

  const onUpdateFolder = async ({ folderId: updatedFolderId }) => {
    await updateLink({
      linksDetails: _map(selectedLinks, (id) => ({
        id,
        folderId: updatedFolderId,
      })),
      oldStatus: isCompleted,
      oldFolderId: folderId,
    });

    closeFolderList();

    if (_size(links) <= DEFAULT_PAGE_SIZE) {
      fetchMoreFeed();
    }
  };

  const handleActions = async ({ value, linkId }) => {
    switch (value) {
      case 'EDIT': {
        openEditLinkModal({ linkId });
        break;
      }

      case 'DELETE': {
        setLinkOperation(DELETE_LINK_OPERATION);
        await deleteLink({ linkIds: [linkId], isCompleted, folderId });

        if (_size(links) <= DEFAULT_PAGE_SIZE) {
          fetchMoreFeed();
        }

        break;
      }

      case 'MARK_AS_PENDING':
      case 'MARK_AS_COMPLETE': {
        await updateLink({
          linksDetails: [{ id: linkId, isCompleted: !isCompleted }],
          oldStatus: isCompleted,
          oldFolderId: folderId,
        });

        if (_size(links) <= DEFAULT_PAGE_SIZE) {
          fetchMoreFeed();
        }

        break;
      }

      case 'SELECT': {
        enableBulkSelectionMode({ linkId });
        break;
      }

      case 'MOVE': {
        setShowFolderList(true);
        setSelectedLinks([linkId]);
        break;
      }

      case 'COPY': {
        const { url } = _find(links, ({ id }) => id == linkId);
        copyToClipboard({ text: url });
        break;
      }

      default: {
        return;
      }
    }
  };

  const handleBulkSelectionActions = async ({ type }) => {
    switch (type) {
      case 'DELETE': {
        setLinkOperation(DELETE_LINK_OPERATION);

        await deleteLink({ linkIds: selectedLinks, isCompleted, folderId });

        disableBulkSelectionMode();

        if (_size(links) <= DEFAULT_PAGE_SIZE) {
          fetchMoreFeed();
        }
        break;
      }
      case 'CANCEL': {
        disableBulkSelectionMode();
        break;
      }
      case 'UPDATE_STATUS': {
        await updateLink({
          linksDetails: _map(selectedLinks, (id) => ({
            id,
            isCompleted: !isCompleted,
          })),
          oldStatus: isCompleted,
          oldFolderId: folderId,
        });

        disableBulkSelectionMode();

        if (_size(links) <= DEFAULT_PAGE_SIZE) {
          fetchMoreFeed();
        }

        break;
      }
      case 'MOVE': {
        setShowFolderList(true);
        break;
      }

      default: {
        return;
      }
    }
  };

  const updateSelectedLinks = ({ id }) => {
    setSelectedLinks((selectedLinks) => {
      const filteredLinks = _filter(
        selectedLinks,
        (selectedLinkId) => selectedLinkId !== id
      );
      if (_size(filteredLinks) === _size(selectedLinks)) {
        return [...selectedLinks, id];
      }
      return filteredLinks;
    });
  };

  const totalLinks = _size(links);

  const renderLinks = () => {
    if (_isEmpty(links)) {
      return 'No links';
    }
    const linkActions = getLinkActions({ isCompleted });
    return _map(links, (link, index) => {
      const { id } = link;
      const isLinkSelected = _includes(selectedLinks, id);

      const onChange = (e) => {
        e.stopPropagation();
        updateSelectedLinks({ id });
      };

      const onLinkMetadataLoaded = () => {
        if (linkOperation !== ADD_LINK || index !== totalLinks - 1) {
          return;
        }

        scrollToBottom(listScrollRef.current);
        setLinkOperation(null);
      };

      return (
        <div
          className={classes.linkOption}
          key={id}
          ref={(node) => updateLinksNodeRefs(node, index)}
        >
          {showBulkSelection && (
            <Checkbox
              size="lg"
              isChecked={isLinkSelected}
              backgroundColor="white"
              borderColor="rgba(0,0,0,0.5)"
              onChange={onChange}
            />
          )}
          <div className={classes.linkContainer}>
            <Link
              {...link}
              dropDownOptions={linkActions}
              handleActions={handleActions}
              onLinkMetadataLoaded={onLinkMetadataLoaded}
            />
          </div>
        </div>
      );
    });
  };

  const onScroll = (e) => {
    const fetchMoreCallback = () => setLinkOperation(FETCH_MORE_LINK);

    onPageScroll && onPageScroll(e, fetchMoreCallback);
  };

  const linkAddedOrUpdatedCallback = ({
    isCompleted: updatedStatus,
    folderId: updatedFolderId,
  }) => {
    const isLinkStatusUpdated = getFieldPresenceStatus(updatedStatus);

    const isFolderUpdated = getFieldPresenceStatus(updatedFolderId);

    if (isLinkStatusUpdated || isFolderUpdated) {
      if (_size(links) <= DEFAULT_PAGE_SIZE) {
        fetchMoreFeed();
      }
    }
  };

  const scrollContainerClasses = combineClasses(classes.scrollContainer, {
    [classes.scrollContainerWithSmoothScrolling]: linkOperation === ADD_LINK,
  });

  return (
    <div className={classes.container}>
      {showBulkSelection && (
        <Actions
          onCancelClick={() => handleBulkSelectionActions({ type: 'CANCEL' })}
          onDeleteClick={() => handleBulkSelectionActions({ type: 'DELETE' })}
          onMoveClick={() => handleBulkSelectionActions({ type: 'MOVE' })}
          onUpdateStatusClick={() =>
            handleBulkSelectionActions({ type: 'UPDATE_STATUS' })
          }
          statusButtonLabel={
            isCompleted ? 'Mark as pending' : 'Mark as completed'
          }
          totalSelectedLinks={_size(selectedLinks)}
        />
      )}
      {renderLoader && renderLoader()}
      <div
        className={scrollContainerClasses}
        ref={listScrollRef}
        onScroll={onScroll}
      >
        <div className={classes.listContainer}>
          {renderLinks()}

          {showEditLinkModal && (
            <EditOrCreateLinkModal
              linkId={selectedLinks?.[0] ?? ''}
              closeModal={closeEditLinkModal}
              folderId={folderId}
              linkAddedOrUpdatedCallback={linkAddedOrUpdatedCallback}
            />
          )}
          {showFolderList && (
            <FolderListModal
              selectedLinks={selectedLinks}
              closeModal={closeFolderList}
              currentFolderId={folderId}
              onUpdateFolder={onUpdateFolder}
            />
          )}
        </div>
      </div>
    </div>
  );
};

const mapActionCreators = {
  deleteLink,
  updateLink,
};

export default compose(
  connect(null, mapActionCreators),
  withQuery(getFolderDetailsQuery, {
    name: 'getFolderDetails',
    displayName: 'getFolderDetails',
    fetchPolicy: 'cache-and-network',
    getVariables: ({ folderId, isCompleted }) => {
      return {
        input: { id: folderId, type: 'FOLDER' },
        linkFilterInputV2: { isCompleted, first: DEFAULT_PAGE_SIZE },
      };
    },
    getSkipQueryState: ({ folderId }) => !folderId,
    mapQueryDataToProps: ({
      getFolderDetails,
      ownProps: { folderId, isCompleted },
    }) => {
      const { networkStatus } = getFolderDetails;

      /**
       * Reading from cache is needed as sometimes getFolderDetails returns wrong cached data
       */
      const folderDetails = getFolderDetailsFromCache({
        folderId,
        linkFilters: { isCompleted, first: DEFAULT_PAGE_SIZE },
        showOptimistic: true,
      });

      const isData = !_isEmpty(folderDetails);
      const isLoading = _includes([1, 2], networkStatus);

      const pageInfo = _get(folderDetails, 'linksV2.pageInfo', {});
      const { endCursor, hasNextPage } = pageInfo;

      const fetchMore = async ({ first = DEFAULT_PAGE_SIZE } = {}) => {
        return await getFolderDetails.fetchMore({
          //BUG: setting query option will not update network status while refetching
          variables: {
            input: {
              id: folderId,
              type: 'FOLDER',
            },
            linkFilterInputV2: { isCompleted, first, after: endCursor },
          },
          updateQuery: (previousFeed, { fetchMoreResult }) => {
            const { node: oldNode } = previousFeed;
            const { node: newNode } = fetchMoreResult;

            const { linksV2: oldLinksV2 } = oldNode;
            const { linksV2: newLinksV2 } = newNode;

            const { edges: oldEdges } = oldLinksV2;
            const { edges: newEdges } = newLinksV2;

            const updatedEdges = [...oldEdges, ...newEdges];

            const { pageInfo: updatedPageInfo } = newLinksV2;

            return {
              ...previousFeed,
              node: {
                ...oldNode,
                linksV2: {
                  ...oldLinksV2,
                  edges: updatedEdges,
                  pageInfo: updatedPageInfo,
                },
              },
            };
          },
        });
      };

      return {
        isData,
        isLoading,
        folderDetails,
        networkStatus,
        hasNextPage,
        fetchMore,
      };
    },
  }),
  withPagination({ direction: 'TOP', loaderContainerStyle: loaderStyle })
)(Links);


import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import Link from '../../components/Link';
import Modal from './Modal';
import Thumbnail from '../../components/Thumbnail';
import LinksSentence from '../../components/LinksSentence';
import Loader from '../../components/Loader';
import Icon from '../../components/Icon';
import ProgressSlider from '../../components/Fields/ProgressSlider';
import * as uiActions from '../../services/ui/actions';
import * as mopidyActions from '../../services/mopidy/actions';
import * as geniusActions from '../../services/genius/actions';
import { isLoading } from '../../util/helpers';
import { i18n, I18n } from '../../locale';

const LyricsScroller = ({ content = '', time_position = 1, duration = 100 }) => {
  const percent = ((time_position / duration) * 110).toFixed(4);

  return (
    <div className="lyrics">
      <div
        className="lyrics__content"
        dangerouslySetInnerHTML={{ __html: content }}
        style={{ transform: `translateY(-${percent}%)` }}
      />
    </div>
  );
}

const Lyrics = ({
  show_lyrics,
  load_queue,
  time_position = null,
  current_track,
}) => {
  if (!show_lyrics) {
    return null;
  }

  const { lyrics, duration } = current_track || {};

  if (isLoading(load_queue, ['genius_'])) {
    return (
      <div className="lyrics">
        <Loader body loading />
      </div>
    );
  }
  if (lyrics) {
    return (
      <LyricsScroller
        content={lyrics}
        time_position={time_position}
        duration={duration}
      />
    );
  };
  return null;
};

class KioskMode extends React.Component {

  componentDidMount() {
    const {
      current_track,
      genius_authorized,
      show_lyrics,
      geniusActions,
    } = this.props;
    this.setWindowTitle();

    if (show_lyrics && genius_authorized && current_track && current_track.artists && !current_track.lyrics_results) {
      geniusActions.findTrackLyrics(current_track);
    }
  }

  componentDidUpdate = ({
    current_track: prev_current_track,
  }) => {
    const {
      current_track,
      show_lyrics,
      genius_authorized,
      geniusActions: {
        findTrackLyrics,
      },
    } = this.props;

    if (!prev_current_track && current_track) {
      this.setWindowTitle(current_track);

      if (show_lyrics && genius_authorized && current_track && current_track.artists && !current_track.lyrics_results) {
        findTrackLyrics(current_track);
      }
    } else if (show_lyrics !== show_lyrics && show_lyrics && current_track) {
      if (genius_authorized && current_track && current_track.artists && !current_track.lyrics_results) {
        findTrackLyrics(current_track);
      }
    }
  }

  setWindowTitle(current_track = this.props.current_track) {
    if (current_track) {
      let artists = '';
      for (let i = 0; i < current_track.artists.length; i++) {
        if (artists != '') {
          artists += ', ';
        }
        artists += current_track.artists[i].name;
      }
      this.props.uiActions.setWindowTitle(i18n('modal.kiosk.title_window', { name:current_track.name, artists }));
    } else {
      this.props.uiActions.setWindowTitle(i18n('modal.kiosk.title'));
    }
  }

  togglePlay(e) {
    if (this.props.play_state == 'playing') {
      this.props.mopidyActions.pause();
    } else {
      this.props.mopidyActions.play();
    }
  }

  toggleLyrics = () => {
    const {
      show_lyrics,
      uiActions,
      genius_authorized,
      current_track,
    } = this.props;

    if (!genius_authorized) {
      uiActions.createNotification({ level: 'warning', content: `${i18n('track.want_lyrics')} ${i18n('settings.title')}` });
      return;
    }
    uiActions.set({ show_lyrics: !show_lyrics });
    if (
      !show_lyrics
      && this.props.genius_authorized
      && current_track
      && current_track.artists
      && !current_track.lyrics_results) {
      this.props.geniusActions.findTrackLyrics(current_track);
    }
  }

  renderPlayButton() {
    let button = <button className="control play" onClick={() => this.props.mopidyActions.play()}><Icon name="play_circle_filled" type="material" /></button>;
    if (this.props.play_state == 'playing') {
      button = <button className="control play" onClick={() => this.props.mopidyActions.pause()}><Icon name="pause_circle_filled" type="material" /></button>;
    }
    return button;
  }

  render() {
    const {
      show_lyrics,
      current_track,
      load_queue,
      genius_authorized,
      time_position,
    } = this.props;
    const lyrics_enabled = show_lyrics && genius_authorized;
    if (current_track && current_track.images) {
      var { images } = current_track;
    } else {
      var images = [];
    }

    const extraControls = (
      <div className="control" onClick={this.toggleLyrics}>
        {lyrics_enabled ? <Icon name="toggle_on" className="turquoise-text" />
          : <Icon name="toggle_off" />}
        <div style={{ paddingLeft: '6px', fontWeight: 'bold' }}>
          <I18n path="modal.kiosk.lyrics" />
        </div>
      </div>
    );

    return (
      <Modal
        className="modal--kiosk-mode"
        extraControls={extraControls}
      >
        <Thumbnail className="background" images={images} placeholder={false} />

        <div className={`player player--${lyrics_enabled ? 'with' : 'without'}-lyrics`}>

          <div className="track">
            <div className="track__artwork">
              <Thumbnail images={images} useImageTag />
            </div>
            <div className="track__info">
              <div className="title">{ current_track ? current_track.name : <span>-</span> }</div>
              { current_track ? <LinksSentence nolinks items={current_track.artists} /> : <LinksSentence /> }
            </div>
          </div>

          <div className="playback">
            <div className="playback__controls">
              <button className="control previous" onClick={() => this.props.mopidyActions.previous()}>
                <Icon name="navigate_before" type="material" />
              </button>
              { this.renderPlayButton() }
              <button className="control next" onClick={() => this.props.mopidyActions.next()}>
                <Icon name="navigate_next" type="material" />
              </button>
            </div>
            <div className="playback__progress">
              <ProgressSlider />
            </div>
          </div>

        </div>

        <Lyrics
          show_lyrics={lyrics_enabled}
          load_queue={load_queue}
          genius_authorized={genius_authorized}
          time_position={time_position}
          current_track={current_track}
        />
      </Modal>
    );
  }
}

const mapStateToProps = (state) => ({
  play_state: state.mopidy.play_state,
  current_track: (state.core.current_track && state.core.items[state.core.current_track.uri] !== undefined ? state.core.items[state.core.current_track.uri] : null),
  time_position: state.mopidy.time_position,
  load_queue: state.ui.load_queue,
  show_lyrics: state.ui.show_lyrics,
  genius_authorized: state.genius.authorization,
});

const mapDispatchToProps = (dispatch) => ({
  uiActions: bindActionCreators(uiActions, dispatch),
  mopidyActions: bindActionCreators(mopidyActions, dispatch),
  geniusActions: bindActionCreators(geniusActions, dispatch),
});

export default connect(mapStateToProps, mapDispatchToProps)(KioskMode);

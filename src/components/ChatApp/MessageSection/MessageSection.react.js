import MessageComposer from '../MessageComposer.react';
import MessageListItem from '../MessageListItem/MessageListItem.react';
import MessageStore from '../../../stores/MessageStore';
import React, { Component } from 'react';
import ThreadStore from '../../../stores/ThreadStore';
import * as Actions from '../../../actions/';
import UserPreferencesStore from '../../../stores/UserPreferencesStore';
import PropTypes from 'prop-types';
import { addUrlProps, UrlQueryParamTypes } from 'react-url-query';
import loadingGIF from '../../images/loading.gif';
import DialogSection from './DialogSection';
import RaisedButton from 'material-ui/RaisedButton';
import { CirclePicker } from 'react-color';
import $ from 'jquery';
import ScrollArea from 'react-scrollbar';
import TopBar from '../TopBar.react';

function getStateFromStores() {
  return {
    messages: MessageStore.getAllForCurrentThread(),
    thread: ThreadStore.getCurrent(),
    currTheme: UserPreferencesStore.getTheme(),
    search: false,
    showLoading: MessageStore.getLoadStatus(),
    open: false,
    showSettings: false,
    showThemeChanger: false,
    showHardwareChangeDialog: false,
    showHardware: false,
    showServerChangeDialog: false,
    header: UserPreferencesStore.getTheme()==='light' ? '#607D8B' : '#19314B',
    pane: '',
    textarea: '',
    composer:'',
    body:'',
    searchState: {
      markedMsgs: [],
      markedIDs: [],
      markedIndices: [],
      scrollLimit: 0,
      scrollIndex: -1,
      scrollID: null,
      caseSensitive: false,
      open: false,
      searchText:'',
    }
  };
}

function getMessageListItem(messages, markID) {
  if(markID){
    return messages.map((message) => {
      return (
        <MessageListItem
          key={message.id}
          message={message}
          markID={markID}
        />
      );
    });
  }

  return messages.map((message) => {
    return (
      <MessageListItem
        key={message.id}
        message={message}
      />
    );
  });
}

function searchMsgs(messages, matchString, isCaseSensitive) {
  let markingData = {
    allmsgs: [],
    markedIDs: [],
    markedIndices: [],
  };
  messages.forEach((msg, id) => {
    let orgMsgText = msg.text;
    let msgCopy = $.extend(true, {}, msg);
    let msgText = orgMsgText;
    if (orgMsgText) {
      if (!isCaseSensitive) {
        matchString = matchString.toLowerCase();
        msgText = msgText.toLowerCase();
      }
      let match = msgText.indexOf(matchString);
      if (match !== -1) {
        msgCopy.mark = {
          matchText: matchString,
          isCaseSensitive: isCaseSensitive
        };
        markingData.markedIDs.unshift(msgCopy.id);
        markingData.markedIndices.unshift(id);
      }
    }
    markingData.allmsgs.push(msgCopy);
  });
  return markingData;
}

function getLoadingGIF() {
  let messageContainerClasses = 'message-container SUSI';
  const LoadingComponent = (
    <li className='message-list-item'>
      <section className={messageContainerClasses}>
        <img src={loadingGIF}
          style={{ height: '10px', width: 'auto' }}
          alt='please wait..' />
      </section>
    </li>
  );
  return LoadingComponent;
}

const urlPropsQueryConfig = {
  dream: { type: UrlQueryParamTypes.string }
};

class MessageSection extends Component {

  static propTypes = {
    dream: PropTypes.string
  };

  static defaultProps = {
    dream: ''
  };

  state = {
    open: false
  };

  constructor(props) {
    super(props);
    this.state = getStateFromStores();
  }

  handleColorChange = (name,color) => {
    // Current Changes
  }

  handleChangeComplete = (name, color) => {
     // Send these Settings to Server
     let state = this.state;
     if(name === 'header'){
       state.header = color.hex;
     }
     else if(name === 'body'){
       state.body= color.hex;
       document.body.style.setProperty('background', color.hex);
     }
     else if(name ===  'pane') {
       state.pane = color.hex;
     }
     else if(name === 'composer'){
       state.composer = color.hex;

     }
     else if(name === 'textarea') {
       state.textarea = color.hex;

     }
     this.setState(state);
  }

  handleOpen = () => {
    this.setState({ open: true });
  }

  handleClose = () => {
    this.setState({
      open: false,
      showSettings: false,
      showThemeChanger: false,
      showHardware: false
    });
  }

  handleThemeChanger = () => {
    this.setState({showThemeChanger: true});
  }

  handleSettings = () => {
    this.setState({showSettings: true});
  }

  handleHardwareToggle = () => {
      this.setState({
        showSettings: true,
        showServerChangeDialog: false,
        showHardwareChangeDialog: false
      });
  }

  hardwareSettingChanged = () => {
    this.setState({
      showSettings: false,
      showServerChangeDialog: false,
      showHardwareChangeDialog: true
    });
  }

  changeTheme = (newTheme) => {
    if(this.state.currTheme !== newTheme){
      let headerColor = '';
      switch(newTheme){
        case 'light': {
            headerColor = '#607d8b';
            break;
        }
        case 'dark': {
            headerColor = '#19324c';
            break;
        }
        default: {
            // do nothing
        }
      }
      this.setState({header: headerColor});
      Actions.themeChanged(newTheme);
    }
  }

  serverSettingChanged = () => {
    this.setState({
      showSettings: false,
      showHardware: false,
      showServerChangeDialog: true
    });
  }

  handleServerToggle = (changeServer) => {
    if(changeServer){
      // Logout the user and show the login screen again
      this.props.history.push('/logout');
      this.setState({
        open:true
      });
    }
    else{
      // Go back to settings dialog
      this.setState({
        showSettings: true,
        showServerChangeDialog: false,
        showHardwareChangeDialog: false
      });
    }
  }

  implementSettings = (values) => {
    this.setState({showSettings: false});
    this.changeTheme(values.theme);
  }

  searchTextChanged = (event) => {
    let matchString = event.target.value;
    let messages = this.state.messages;
    let markingData = searchMsgs(messages, matchString,
                              this.state.searchState.caseSensitive);
    if(matchString){
      let searchState = {
        markedMsgs: markingData.allmsgs,
        markedIDs: markingData.markedIDs,
        markedIndices: markingData.markedIndices,
        scrollLimit: markingData.markedIDs.length,
        scrollIndex: 0,
        scrollID: markingData.markedIDs[0],
        caseSensitive: this.state.searchState.caseSensitive,
        open: false,
        searchText: matchString
      };
      this.setState({
        searchState: searchState
      });
    }
    else {
      let searchState = {
        markedMsgs: markingData.allmsgs,
        markedIDs: markingData.markedIDs,
        markedIndices: markingData.markedIndices,
        scrollLimit: markingData.markedIDs.length,
        scrollIndex: -1,
        scrollID: null,
        caseSensitive: this.state.searchState.caseSensitive,
        open: false,
        searchText: ''
      }
      this.setState({
        searchState: searchState
      });
    }
  }

  componentDidMount() {
    this._scrollToBottom();
    MessageStore.addChangeListener(this._onChange.bind(this));
    ThreadStore.addChangeListener(this._onChange.bind(this));
  }

  componentWillUnmount() {
    MessageStore.removeChangeListener(this._onChange.bind(this));
    ThreadStore.removeChangeListener(this._onChange.bind(this));
  }

  componentWillMount() {

    if (this.props.location) {
      if (this.props.location.state) {
        if (this.props.location.state.hasOwnProperty('showLogin')) {
          let showLogin = this.props.location.state.showLogin;
          this.setState({ open: showLogin });
        }
      }
    }

    UserPreferencesStore.on('change', () => {
      this.setState({
        currTheme: UserPreferencesStore.getTheme()
      })
      switch(this.state.currTheme){
        case 'light':{
          document.body.className = 'white-body';
          break;
        }
        case 'dark':{
          document.body.className = 'dark-body';
          break;
        }
        default: {
            // do nothing
        }
      }
    })
  }

  render() {

    const bodyStyle = {
      'padding': 0,
      textAlign: 'center'
    }

    const {
      dream
    } = this.props;

    var backgroundCol;
    let topBackground = this.state.currTheme;
    switch(topBackground){
      case 'light':{
        backgroundCol = '#607d8b';
        break;
      }
      case 'dark':{
        backgroundCol =  '#19324c';
        break;
      }
      default: {
          // do nothing
      }
    }

    const actions = <RaisedButton
      label="Cancel"
      backgroundColor={
        UserPreferencesStore.getTheme()==='light' ? '#607D8B' : '#19314B'}
      labelColor="#fff"
      width='200px'
      keyboardFocused={true}
      onTouchTap={this.handleClose}
    />;

    const serverDialogActions = [
    <RaisedButton
      key={'Cancel'}
      label="Cancel"
      backgroundColor={
        UserPreferencesStore.getTheme()==='light' ? '#607D8B' : '#19314B'}
      labelColor="#fff"
      width='200px'
      keyboardFocused={false}
      onTouchTap={this.handleServerToggle.bind(this,false)}
      style={{margin: '6px'}}
    />,
    <RaisedButton
      key={'OK'}
      label="OK"
      backgroundColor={
        UserPreferencesStore.getTheme()==='light' ? '#607D8B' : '#19314B'}
      labelColor="#fff"
      width='200px'
      keyboardFocused={false}
      onTouchTap={this.handleServerToggle.bind(this,true)}
    />];
    const hardwareActions = [
    <RaisedButton
      key={'Cancel'}
      label="Cancel"
      backgroundColor={
        UserPreferencesStore.getTheme()==='light' ? '#607D8B' : '#19314B'}
      labelColor="#fff"
      width='200px'
      keyboardFocused={false}
      onTouchTap={this.handleHardwareToggle}
      style={{margin: '6px'}}
    />
    ]

    const componentsList = [
      {'id':1, 'component':'header', 'name': 'Header'},
      {'id':2, 'component': 'pane', 'name': 'Message Pane'},
      {'id':3, 'component':'body', 'name': 'Body'},
      {'id':4, 'component':'composer', 'name': 'Composer'},
      {'id':5, 'component':'textarea', 'name': 'Textarea'}
    ];

    const components = componentsList.map((component) => {
        return <div key={component.id} className='circleChoose'>
                  <h4>Change color of {component.name}:</h4>
                  <CirclePicker  color={component} width={'100%'}
        onChangeComplete={ this.handleChangeComplete.bind(this,component.component) }
        onChange={this.handleColorChange.bind(this,component.id)}>
        </CirclePicker></div>
    })

    var body = this.state.body;
    var pane = this.state.pane;
    var composer = this.state.composer;

    let messageListItems = [];
    if(this.state.search){
      let markID = this.state.searchState.scrollID;
      let markedMessages = this.state.searchState.markedMsgs;
      messageListItems = getMessageListItem(markedMessages,markID);
    }
    else{
      messageListItems = getMessageListItem(this.state.messages);
    }

    if (this.state.thread) {

        return (
          <div className={topBackground} style={{background:body}}>
            <header className='message-thread-heading'
            style={{ backgroundColor: backgroundCol }}>
              <TopBar
                {...this.props}
                handleSettings={this.handleSettings}
                handleThemeChanger={this.handleThemeChanger}
                handleOpen={this.handleOpen}
                handleOptions={this.handleOptions}
                handleRequestClose={this.handleRequestClose}
                handleToggle={this.handleToggle}
                searchTextChanged={this.searchTextChanged}
                _onClickSearch={this._onClickSearch}
                _onClickExit={this._onClickExit}
                _onClickRecent={this._onClickRecent}
                _onClickPrev={this._onClickPrev}
                search={this.state.search}
                searchState={this.state.searchState}
              />
            </header>
            {!this.state.search ? (
            <div>
            <div className='message-pane'>
              <div className='message-section'>
                <ul
                  className='message-list'
                  ref={(c) => { this.messageList = c; }}
                  style={{background:pane}}>
                  {messageListItems}
                  {this.state.showLoading && getLoadingGIF()}
                </ul>
                <div className='compose' style={{background:composer}}>
                  <MessageComposer
                    threadID={this.state.thread.id}
                    dream={dream}
                    textarea={this.state.textarea} />
                </div>
              </div>
            </div>

            <DialogSection
              {...this.props}
              openLogin={this.state.open}
              openSetting={this.state.showSettings}
              openServerChange={this.state.showServerChangeDialog}
              openHardwareChange={this.state.showHardwareChangeDialog}
              openThemeChanger={this.state.showThemeChanger}
              ThemeChangerComponents={components}
              bodyStyle={bodyStyle}
              actions={actions}
              ServerChangeActions={serverDialogActions}
              HardwareActions={hardwareActions}
              onRequestClose={()=>this.handleClose}
              onRequestCloseServerChange={()=>this.handleServerToggle.bind(this,false)}
              onRequestCloseHardwareChange={
                ()=>this.handleHardwareToggle.bind(this, false)}
              onSettingsSubmit={()=>this.implementSettings}
              onServerChange={()=>this.serverSettingChanged}
              onHardwareSettings={()=>this.hardwareSettingChanged}/>
            </div>)
             : (
             <div className='message-pane'>
               <div className='message-section'>
                 <ul
                   className="message-list"
                   ref={(c) => { this.messageList = c; }}
                   style={{background:pane}}>
                   <ScrollArea
                     ref={(ref) => { this.scrollarea = ref; }}>
                     {messageListItems}
                   </ScrollArea>
                 </ul>
               </div>
             </div>
             )}
           </div>
         );
     }

     return <div className='message-section'></div>;
   }

  componentDidUpdate() {
    switch (this.state.currTheme) {
      case 'light':{
        document.body.className = 'white-body';
        break;
      }
      case 'dark':{
        document.body.className = 'dark-body';
        break;
      }
      default: {
          // do nothing
      }
    }

    if(this.state.search){
      if (this.state.searchState.scrollIndex === -1
        || this.state.searchState.scrollIndex === null) {
        this._scrollToBottom();
      }
      else {
        let markedIDs = this.state.searchState.markedIDs;
        let markedIndices = this.state.searchState.markedIndices;
        let limit = this.state.searchState.scrollLimit;
        let ul = this.messageList;
        if (markedIDs && ul && limit > 0) {
          let currentID = markedIndices[this.state.searchState.scrollIndex];
          this.scrollarea.content.childNodes[currentID].scrollIntoView();
        }
      }
    }
    else{
      this._scrollToBottom();
    }
  }

  _scrollToBottom = () => {
    let ul = this.messageList;
    if (ul) {
      ul.scrollTop = ul.scrollHeight;
    }
  }

  _onClickPrev = () => {
    let newIndex = this.state.searchState.scrollIndex + 1;
    let indexLimit = this.state.searchState.scrollLimit;
    let markedIDs = this.state.searchState.markedIDs;
    let ul = this.messageList;
    if (markedIDs && ul && newIndex < indexLimit) {
      let currState = this.state.searchState;
      currState.scrollIndex = newIndex;
      currState.scrollID = markedIDs[newIndex];
      this.setState({
        searchState: currState
      });
    }
  }

  _onClickRecent = () => {
    let newIndex = this.state.searchState.scrollIndex - 1;
    let markedIDs = this.state.searchState.markedIDs;
    let ul = this.messageList;
    if (markedIDs && ul && newIndex >= 0) {
      let currState = this.state.searchState;
      currState.scrollIndex = newIndex;
      currState.scrollID = markedIDs[newIndex];
      this.setState({
        searchState: currState
      });
    }
  }

  _onClickSearch = () => {
    let searchState = this.state.searchState;
    searchState.markedMsgs = this.state.messages;
    this.setState({
      search: true,
      searchState: searchState,
    });
  }

  _onClickExit = () => {
    let searchState = this.state.searchState;
    searchState.searchText = '';
    this.setState({
      search: false,
      searchState: searchState,
    });
  }

  handleOptions = (event) => {
    event.preventDefault();
    let searchState = this.state.searchState;
    searchState.open = true;
    searchState.anchorEl = event.currentTarget;
    this.setState({
      searchState: searchState,
    });
  }

  handleToggle = (event, isInputChecked) => {
    let searchState = {
      markedMsgs: this.state.messages,
      markedIDs: [],
      markedIndices: [],
      scrollLimit: 0,
      scrollIndex: -1,
      scrollID: null,
      caseSensitive: isInputChecked,
      open: true,
      searchText: ''
    }
    this.setState({
      searchState: searchState
    });
  }

  handleRequestClose = () => {
    let searchState = this.state.searchState;
    searchState.open = false;
    this.setState({
      searchState: searchState,
    });
  };

  /**
   * Event handler for 'change' events coming from the MessageStore
   */
  _onChange() {
    this.setState(getStateFromStores());
  }

};

MessageSection.propTypes = {
  location: PropTypes.object,
  history: PropTypes.object
};

export default addUrlProps({ urlPropsQueryConfig })(MessageSection);
'use strict';
import React, { Component } from 'react';


class GooglePlacesAutocomplete extends Component {
  constructor(props) {
    super(props);

    this._clearAutocomplete = this._clearAutocomplete.bind(this);
    this._getActiveItem = this._getActiveItem.bind(this);
    this._handleEnterKey = this._handleEnterKey.bind(this);
    this._handleDownKey = this._handleDownKey.bind(this);
    this._handleUpKey = this._handleUpKey.bind(this);
    this._handleSelect = this._handleSelect.bind(this);
    this._handleFocusChange = this._handleFocusChange.bind(this);
    this._selectAddress = this._selectAddress.bind(this);
    this._selectActiveItemAtIndex = this._selectActiveItemAtIndex.bind(this);
    this._setActiveItemAtIndex = this._setActiveItemAtIndex.bind(this);

    this.autocompleteCallback = this.autocompleteCallback.bind(this);
    this.handleInputKeyDown = this.handleInputKeyDown.bind(this);
    this.handleInputChange = this.handleInputChange.bind(this);
    this.renderAutocomplete = this.renderAutocomplete.bind(this);
    this.renderSuggestedLocation = this.renderSuggestedLocation.bind(this);

    this.state = { autocompleteItems: [] };
  }

  componentDidMount() {
    this.autocompleteService = new google.maps.places.AutocompleteService();
    this.autocompleteOK = google.maps.places.PlacesServiceStatus.OK;
  }

  autocompleteCallback(predictions, status) {
    if (status != this.autocompleteOK) {
      throw new Error(`Google Places Autocompletion failed to return valid suggestions for given location!`);
    }

    this.setState({
      autocompleteItems: predictions.map((p, idx) => ({
        suggestion: p.description,
        placeId: p.place_id,
        active: false,
        index: idx
      }))
    })
  }

  _clearAutocomplete() { this.setState({ autocompleteItems: [] }); }

  _getActiveItem() { return this.state.autocompleteItems.find(item => item.active); }


  _handleEnterKey() {
    const activeItem = this._getActiveItem();
    if (activeItem === undefined) { return; }

    this._clearAutocomplete();
    this._handleSelect(activeItem.suggestion);
  }

  _handleDownKey() {
    const activeItem = this._getActiveItem()
    if (activeItem === undefined) {
      this._selectActiveItemAtIndex(0)
    } else {
      const nextIndex = (activeItem.index + 1) % this.state.autocompleteItems.length
      this._selectActiveItemAtIndex(nextIndex)
    }
  }

  _handleUpKey() {
    const activeItem = this._getActiveItem()
    if (activeItem === undefined) {
      this._selectActiveItemAtIndex(this.state.autocompleteItems.length - 1)
    } else {
      let prevIndex
      if (activeItem.index === 0) {
        prevIndex = this.state.autocompleteItems.length - 1
      } else {
        prevIndex = (activeItem.index - 1) % this.state.autocompleteItems.length
      }
      this._selectActiveItemAtIndex(prevIndex)
    }
  }

  _handleSelect(address) {
    this.props.onSelect ? this.props.onSelect(address) : this.props.onChange(address)
  }

  _selectAddress(address) {
    this._clearAutocomplete();
    this._handleSelect(address);
  }

  _selectActiveItemAtIndex(index) {
    const activeName = this.state.autocompleteItems.find(item => item.index === index).suggestion;
    this._setActiveItemAtIndex(index);
    this.props.onChange(activeName);
  }

  _setActiveItemAtIndex(setIndex) {
    // console.log(`Moused over index ${setIndex}!`);
    const newState = this.state.autocompleteItems.map((item, index) => ({
      ...item,
      active: index === setIndex ? true : false
    }));
    this.setState({ autocompleteItems: newState });
  }

  _handleFocusChange(evt) {
    const [parentContainer, suggestionsList] = [evt.target.parentElement, this.refs.suggestionsList],
          isActive = parentContainer.classList.contains('active');

    parentContainer.classList.toggle('active');
    isActive
      ? suggestionsList.classList.remove('enableList')
      : suggestionsList.classList.add('enableList');
  }

  handleInputKeyDown(evt) {
    const [KEY_CODE, ARROW_UP, ARROW_DOWN, ENTER_KEY] = [evt.keyCode, 38, 40, 13];

    switch (true) {
      case (KEY_CODE === ENTER_KEY):
        event.preventDefault();
        this._handleEnterKey();
        break;
      case (KEY_CODE === ARROW_DOWN):
        this._handleDownKey();
        break;
      case (KEY_CODE === ARROW_UP):
        this._handleUpKey();
        break;
      case (KEY_CODE < 48):
      case (KEY_CODE > 57 && KEY_CODE < 65):
      case (KEY_CODE > 90 && KEY_CODE < 96):
      case (KEY_CODE > 105):
        console.warn(`No actions recognized for input <${String.fromCharCode(KEY_CODE)}> corresponding to keyCode <${KEY_CODE}>.`);
        break;
    }
  }

  handleInputChange(evt) {
    this.props.onChange(evt.target.value);
    if (!evt.target.value) {
      this._clearAutocomplete();
      return;
    }
    this.autocompleteService.getPlacePredictions({
      ...this.props.options,
      input: evt.target.value
    }, this.autocompleteCallback);
  }

  autocompleteItemStyle(active) {
    return active
      ? { ...defaultStyles.autocompleteItemActive, ...this.props.styles.autocompleteItemActive }
      : { };
  }

  renderLabel() {
    if (this.props.hideLabel) { return null }
    return (<label style={this.props.styles.label} className={this.props.classNames.label || ''}>Location</label>)
  }

  renderOverlay() {
    if (this.state.autocompleteItems.length === 0) { return null }
    return (
      <div
        className="PlacesAutocomplete__overlay"
        // style={defaultStyles.autocompleteOverlay}
        onClick={ () => this._clearAutocomplete() }>
      </div>
    )
  }

  renderSuggestedLocation(place, id) {
    return (
      <li
        key={ `AutoSuggestLocation_${place.placeId}` }
        className="__autocomplete-item text-of"
        onMouseOver={ () => this._setActiveItemAtIndex(place.index) }
        onClick={ () => this._selectAddress(place.suggestion) }>
        { this.props.autocompleteItem({ suggestion: place.suggestion }) }
      </li>
    );
  }

  renderAutocomplete() {
    const { autocompleteItems } = this.state;
    const { styles } = this.props;

    if (autocompleteItems.length === 0) {
      return (
        <ul
          className="__autocomplete-container"
          ref="suggestionsList" />
      );
    }

    return (
      <ul
        className="__autocomplete-container"
        ref="suggestionsList">
        { autocompleteItems.map(place => this.renderSuggestedLocation(place)) }
      </ul>
    );
  }

  // TODO: remove `classNames.container` in the next version release.
  render() {
    const { classNames, styles, value } = this.props;
    const { autoCapitalize, autoComplete, callback, results, placeholder } = this.props.options;
    return (
      <div
        id="searchLocation"
        className="formSearchInpt">
        <input
          className="formSearchInpt"
          type="text"
          ref="locationInput"
          placeholder={ placeholder }
          value={ value }
          autoCapitalize={ autoCapitalize }
          autoComplete={ autoComplete }
          results={ results }
          onChange={ this.handleInputChange }
          onFocus={ this._handleFocusChange }
          onBlur={ this._handleFocusChange }
          onKeyUp={ this.handleInputKeyDown }
          style={ styles.input }
          required={ true } />
        { this.renderAutocomplete() }
      </div>
    )
  }
}

// { this.props.autocompleteItem({ suggestion: place.suggestion }) }

// { this.renderOverlay() }
// {this.renderLabel()}


GooglePlacesAutocomplete.propTypes = {
  value: React.PropTypes.string.isRequired,
  onChange: React.PropTypes.func.isRequired,
  onSelect: React.PropTypes.func,
  placeholder: React.PropTypes.string,
  hideLabel: React.PropTypes.bool,
  autocompleteItem: React.PropTypes.func,
  classNames: React.PropTypes.shape({
    root: React.PropTypes.string,
    label: React.PropTypes.string,
    input: React.PropTypes.string,
    autocompleteContainer: React.PropTypes.string,
  }),
  styles: React.PropTypes.shape({
    root: React.PropTypes.object,
    label: React.PropTypes.object,
    input: React.PropTypes.object,
    autocompleteContainer: React.PropTypes.object,
    autocompleteItem: React.PropTypes.object,
    autocompleteItemActive: React.PropTypes.object
  }),
  options: React.PropTypes.shape({
    bounds: React.PropTypes.object,
    componentRestrictions: React.PropTypes.object,
    location: React.PropTypes.object,
    offset: React.PropTypes.oneOfType([
      React.PropTypes.number,
      React.PropTypes.string
    ]),
    radius: React.PropTypes.oneOfType([
      React.PropTypes.number,
      React.PropTypes.string
    ]),
    types: React.PropTypes.array
  })
};

GooglePlacesAutocomplete.defaultProps = {
  placeholder: 'Address',
  hideLabel: false,
  classNames: { },
  autocompleteItem: ({ suggestion }) => suggestion,
  styles: { },
  options: { }
};

export default GooglePlacesAutocomplete;




// <div
//   id="__autocomplete-container"
//   className={this.props.classNames.autocompleteContainer || ''}
//   // style={{ ...defaultStyles.autocompleteContainer, ...styles.autocompleteContainer }}
//   >
//   {autocompleteItems.map((p, idx) => (
//     <div
//       key={p.placeId}
//       onMouseOver={() => this._setActiveItemAtIndex(p.index)}
//       onClick={() => this._selectAddress(p.suggestion)}
//       // style={{ ...defaultStyles.autocompleteItem, ...styles.autocompleteItem, ...this.autocompleteItemStyle(p.active) }}
//       >
//       {this.props.autocompleteItem({ suggestion: p.suggestion })}
//     </div>
//   ))}
// </div>

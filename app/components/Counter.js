// @flow
import React, { Component } from 'react'
import { Link } from 'react-router-dom'

class Counter extends Component {
  props: {
    increment: () => void,
    incrementIfOdd: () => void,
    incrementAsync: () => void,
    decrement: () => void,
    counter: number
  };

  render() {
    const { increment, incrementIfOdd, incrementAsync, decrement, counter } = this.props;
    return (
      <div>
        <div className='back' data-tid="backButton">
          <Link to="/">
            <i className="fa fa-arrow-left fa-3x" />
          </Link>
        </div>
        <div className='counter' data-tid="counter">
          {counter}
        </div>
        <div className={'btn-group'}>

          <button className={'btn'} onClick={increment} data-tclass="btn">
            <i className="fa fa-plus" />
          </button>

          <button className={'btn'} onClick={decrement} data-tclass="btn">
            <i className="fa fa-minus" />
          </button>

          <button className={'btn'} onClick={incrementIfOdd} data-tclass="btn">odd</button>

          <button className={'btn'} onClick={() => incrementAsync()} data-tclass="btn">async</button>

        </div>
      </div>
    );
  }
}

export default Counter;

import './Header.css'
import logoUteq from '../../assets/logo-uteq-x2.png'

const Header = () => {
    return(
        <header className='header-component'>
            <img src={logoUteq}></img>
        </header>
    )
}

export default Header;